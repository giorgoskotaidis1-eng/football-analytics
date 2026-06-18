/**
 * POST /api/chat — Send a message and receive an AI reply.
 *
 * Chat flow:
 *  1. Authenticate
 *  2. Resolve or create Conversation
 *  3. Save user ChatMessage
 *  4. Load recent conversation history
 *  5. Fetch relevant MemoryItems for this user
 *  6. Build prompt (system + memories + history + new message)
 *  7. Call AI model
 *  8. Save assistant ChatMessage
 *  9. Attempt to summarise for memory (non-fatal)
 * 10. Return { ok: true, conversationId, message }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAssistantReply } from "@/lib/ai/chat";
import { getRelevantMemories, maybeSummarizeConversation } from "@/lib/ai/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How many recent messages to include as conversation history
const HISTORY_LIMIT = 12;
// How many memory items to retrieve
const MEMORY_LIMIT = 5;
// Cap memory retrieval wait so non-critical memory DB issues do not block chat.
const MEMORY_TIMEOUT_MS = 1200;
// Max characters for auto-generated conversation title from first message
const MAX_CONVERSATION_TITLE_LENGTH = 60;

const sendMessageSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().trim().min(1, "Message cannot be empty").max(4000),
});

const SYSTEM_INSTRUCTIONS = `You are a professional football analytics assistant embedded in a football analytics platform.
You help coaches, analysts, and scouts by answering questions about match data, player statistics, team performance, and football tactics.
Be concise, precise, and professional. Use football terminology correctly.
If you don't know something, say so clearly rather than guessing.
Never reveal, store, or repeat passwords, API keys, tokens, or any sensitive personal credentials.`;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = session.userId;

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const { message: newMessage, conversationId: requestedConvId } = parsed.data;

    // ── Step 2: Resolve or create Conversation ────────────────────────────────
    let conversationId: number;

    if (requestedConvId) {
      const existing = await prisma.conversation.findUnique({
        where: { id: requestedConvId },
        select: { id: true, userId: true },
      });
      // 404 for both missing AND other-user conversations (no info leakage)
      if (!existing || existing.userId !== userId) {
        return NextResponse.json(
          { ok: false, message: "Conversation not found" },
          { status: 404 }
        );
      }
      conversationId = existing.id;

      // Touch updatedAt so the conversation list stays sorted by activity
      try {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        console.error("[api/chat] conversation touch failed:", err);
      }
    } else {
      // Create a new conversation titled from the first message
      const title =
        newMessage.slice(0, MAX_CONVERSATION_TITLE_LENGTH) +
        (newMessage.length > MAX_CONVERSATION_TITLE_LENGTH ? "…" : "");
      const created = await prisma.conversation.create({
        data: { userId, title },
      });
      conversationId = created.id;
    }

    // ── Steps 3 + 4: Load history first, then save user message ─────────────
    // History is loaded BEFORE saving the new user message so we don't need to
    // exclude it from the prompt — it is passed separately as `newUserMessage`.
    //
    // `orderBy: desc + take: N + reverse()` fetches the most-recent N messages
    // in chronological order. Using `orderBy: asc + take: N` would instead
    // return the OLDEST N messages, which is wrong for long conversations.
    const historyMessages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });
    historyMessages.reverse(); // oldest → newest (chronological order for AI)

    try {
      await prisma.chatMessage.create({
        data: {
          userId,
          conversationId,
          role: "user",
          content: newMessage,
        },
      });
    } catch (err) {
      console.error("[api/chat] user message persist failed:", err);
    }

    // ── Step 5: Fetch relevant memories for this user ─────────────────────────
    let memories: Awaited<ReturnType<typeof getRelevantMemories>> = [];
    try {
      const memoryFetch = getRelevantMemories(userId, newMessage, MEMORY_LIMIT).catch(
        (err) => {
          console.error("[api/chat] getRelevantMemories error:", err);
          return [];
        }
      );
      const timeoutFallback = new Promise<
        Awaited<ReturnType<typeof getRelevantMemories>>
      >((resolve) => {
        setTimeout(() => resolve([]), MEMORY_TIMEOUT_MS);
      });
      memories = await Promise.race([memoryFetch, timeoutFallback]);
    } catch (err) {
      console.error("[api/chat] getRelevantMemories error:", err);
    }

    // ── Steps 6 + 7: Build prompt and call AI ────────────────────────────────
    const aiResult = await generateAssistantReply({
      systemInstructions: SYSTEM_INSTRUCTIONS,
      memories,
      history: historyMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      newUserMessage: newMessage,
    });

    // Use `in` narrowing because tsconfig has strict:false (boolean discriminants
    // are not reliably narrowed without strictNullChecks).
    const assistantText = "text" in aiResult ? aiResult.text : null;
    if (!assistantText) {
      const errMsg = "message" in aiResult ? aiResult.message : "AI error";
      return NextResponse.json({ ok: false, message: errMsg }, { status: 503 });
    }

    // ── Step 8: Save assistant message ───────────────────────────────────────
    let assistantMsg: { id: number | null; role: "assistant"; content: string; createdAt: Date };
    try {
      const persisted = await prisma.chatMessage.create({
        data: {
          userId,
          conversationId,
          role: "assistant",
          content: assistantText,
        },
      });
      assistantMsg = {
        id: persisted.id,
        role: "assistant",
        content: persisted.content,
        createdAt: persisted.createdAt,
      };
    } catch (err) {
      console.error("[api/chat] assistant message persist failed:", err);
      assistantMsg = {
        id: null,
        role: "assistant",
        content: assistantText,
        createdAt: new Date(),
      };
    }

    // ── Step 9: Maybe summarise for memory (non-fatal) ────────────────────────
    void maybeSummarizeConversation(userId, conversationId).catch((err) => {
      console.error("[api/chat] maybeSummarizeConversation error:", err);
    });

    // ── Step 10: Return response ──────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      conversationId,
      message: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        createdAt: assistantMsg.createdAt,
      },
    });
  } catch (err) {
    console.error("[api/chat] POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to send message right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
