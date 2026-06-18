/**
 * AI chat service — orchestrates prompt construction and OpenAI calls.
 *
 * The OpenAI client is initialised **lazily** (on first call, then memoised)
 * so that `next build` never crashes when OPENAI_API_KEY is absent at
 * build time — consistent with the pattern used in src/lib/auth.ts and
 * src/lib/email.ts.
 *
 * If OPENAI_API_KEY is missing, the assistant automatically falls back to
 * demo mode. Demo mode keeps the UI usable and persists conversations, but it
 * does not call a real AI model.
 */
import OpenAI from "openai";

// ─── Public types ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface MemoryContext {
  summary: string;
  importanceScore: number;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Default model used when OPENAI_MODEL env var is not set.
 * Override at runtime by setting process.env.OPENAI_MODEL.
 */
const DEFAULT_MODEL = "gpt-4o-mini";

let _client: OpenAI | null = null;

/**
 * Returns true only when the real AI provider can be called.
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Demo mode is enabled when:
 * - AI_ASSISTANT_DEMO_MODE=true, or
 * - OPENAI_API_KEY is missing.
 *
 * This lets the app run safely without paid API billing during demos.
 */
export function isAiDemoModeEnabled(): boolean {
  return process.env.AI_ASSISTANT_DEMO_MODE === "true" || !isAiConfigured();
}

/**
 * Returns the memoised OpenAI client instance.
 * Throws a clear, user-readable error if OPENAI_API_KEY is missing so the
 * calling route can return a clean 5xx with { ok: false, message }.
 */
function getClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[ai/chat] OPENAI_API_KEY is not configured. Add it to your .env file and restart the server."
    );
  }

  _client = new OpenAI({ apiKey });
  return _client;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function buildDemoReply(params: {
  memories: MemoryContext[];
  history: ChatMessage[];
  newUserMessage: string;
}): string {
  const { memories, history, newUserMessage } = params;
  const hasHistory = history.length > 0;
  const hasMemories = memories.length > 0;

  return [
    "🟡 Demo mode is active. The assistant UI, conversations, and database memory plumbing are working, but no real AI model is being called yet.",
    "",
    `Your message was: “${newUserMessage}”`,
    "",
    "What will happen after you add OPENAI_API_KEY:",
    "- this same chat will call the real OpenAI model",
    "- previous conversation messages will be used as context",
    "- useful long-term memories will be saved per user",
    "- the assistant will give football analytics answers instead of this demo response",
    "",
    hasHistory
      ? `This conversation already has ${history.length} previous message(s) available for context.`
      : "This is a new conversation with no previous chat history yet.",
    hasMemories
      ? `There are ${memories.length} relevant memory item(s) ready to be injected when real AI mode is enabled.`
      : "No saved memory items were found yet.",
  ].join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates an assistant reply given prompt context.
 *
 * Returns a discriminated-union result so callers can handle AI errors
 * without try/catch and can surface a clean { ok: false, message } to the
 * frontend.
 *
 * @param systemInstructions - Base system prompt text.
 * @param memories           - Relevant per-user memories to include as context.
 * @param history            - Recent conversation messages (oldest → newest),
 *                             NOT including the new user message.
 * @param newUserMessage     - The message the user just sent.
 */
export async function generateAssistantReply(params: {
  systemInstructions: string;
  memories: MemoryContext[];
  history: ChatMessage[];
  newUserMessage: string;
}): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const { systemInstructions, memories, history, newUserMessage } = params;

  // Demo/fallback mode: keep the chat feature usable without paid OpenAI API.
  if (isAiDemoModeEnabled()) {
    return {
      ok: true,
      text: buildDemoReply({ memories, history, newUserMessage }),
    };
  }

  let client: OpenAI;
  try {
    client = getClient();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI service is not configured";
    return { ok: false, message };
  }

  // Build the system content, injecting relevant memories when available
  const memorySection =
    memories.length > 0
      ? `\n\n## Relevant context from this user's previous conversations:\n${memories
          .map((m) => `- ${m.summary}`)
          .join("\n")}`
      : "";

  const systemContent = `${systemInstructions}${memorySection}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map(
      (m): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: m.role,
        content: m.content,
      })
    ),
    { role: "user", content: newUserMessage },
  ];

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false, message: "The AI model returned an empty response." };
    }
    return { ok: true, text };
  } catch (err) {
    console.error("[ai/chat] OpenAI API error:", err);
    const message =
      err instanceof Error ? err.message : "AI model call failed";
    return { ok: false, message };
  }
}
