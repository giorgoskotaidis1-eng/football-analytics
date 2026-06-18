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
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAssistantReply } from "@/lib/ai/chat";
import { getRelevantMemories, maybeSummarizeConversation } from "@/lib/ai/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How many recent messages to include as conversation history
const HISTORY_LIMIT = 12;
// How many memory items to retrieve
const MEMORY_LIMIT = 5;

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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

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
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "Conversation not found" },
        { status: 404 }
      );
    }
    conversationId = existing.id;

    // Touch updatedAt so the conversation list stays sorted by activity
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  } else {
    // Create a new conversation titled from the first message
    const title =
      newMessage.slice(0, 60) + (newMessage.length > 60 ? "…" : "");
    const created = await prisma.conversation.create({
      data: { userId: user.id, title },
    });
    conversationId = created.id;
  }

  // ── Step 3: Save user message ─────────────────────────────────────────────
  await prisma.chatMessage.create({
    data: {
      userId: user.id,
      conversationId,
      role: "user",
      content: newMessage,
    },
  });

  // ── Step 4: Load recent conversation history ──────────────────────────────
  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });

  // Exclude the message we just saved from history (it goes as the user turn)
  const history = recentMessages.slice(0, -1);

  // ── Step 5: Fetch relevant memories for this user ─────────────────────────
  const memories = await getRelevantMemories(user.id, newMessage, MEMORY_LIMIT);

  // ── Steps 6 + 7: Build prompt and call AI ────────────────────────────────
  const aiResult = await generateAssistantReply({
    systemInstructions: SYSTEM_INSTRUCTIONS,
    memories,
    history: history.map((m) => ({
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
  const assistantMsg = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      conversationId,
      role: "assistant",
      content: assistantText,
    },
  });

  // ── Step 9: Maybe summarise for memory (non-fatal) ────────────────────────
  try {
    await maybeSummarizeConversation(user.id, conversationId);
  } catch (err) {
    console.error("[api/chat] maybeSummarizeConversation error:", err);
  }

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
}
