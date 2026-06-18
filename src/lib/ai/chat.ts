/**
 * AI chat service — orchestrates prompt construction and OpenAI calls.
 *
 * The OpenAI client is initialised lazily so next build never crashes when
 * OPENAI_API_KEY is absent at build time.
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

export interface ImageAttachmentInput {
  type: "image";
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  dataUrl: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Default model used when OPENAI_MODEL env var is not set.
 * Override at runtime by setting process.env.OPENAI_MODEL.
 */
const DEFAULT_MODEL = "gpt-5.4-mini";
const LEGACY_FALLBACK_MODEL = "gpt-4o-mini";

let _client: OpenAI | null = null;

/**
 * Returns true only when the real AI provider can be called.
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Demo mode is enabled only when the real AI provider cannot be called.
 *
 * Important: OPENAI_API_KEY wins over AI_ASSISTANT_DEMO_MODE. This prevents a
 * stale Vercel env var from keeping the assistant stuck in demo mode after the
 * user has configured paid API access.
 */
export function isAiDemoModeEnabled(): boolean {
  return !isAiConfigured();
}

/**
 * Returns the memoised OpenAI client instance.
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

/**
 * Accepts the messy values humans actually type into Vercel.
 * Examples:
 * - "5 mini"       -> "gpt-5.4-mini"
 * - "gpt 5 mini"   -> "gpt-5.4-mini"
 * - "gpt-5-mini"   -> "gpt-5.4-mini"
 * - "gpt-5.4 mini" -> "gpt-5.4-mini"
 */
function normalizeModelName(value: string | undefined): string {
  const raw = (value || DEFAULT_MODEL).trim();
  if (!raw) return DEFAULT_MODEL;

  const compact = raw.toLowerCase().replace(/[_.\s]+/g, "-");

  const aliases: Record<string, string> = {
    "5-mini": DEFAULT_MODEL,
    "gpt-5-mini": DEFAULT_MODEL,
    "gpt5-mini": DEFAULT_MODEL,
    "gpt-5.4-mini": DEFAULT_MODEL,
    "gpt-5-4-mini": DEFAULT_MODEL,
    "5.4-mini": DEFAULT_MODEL,
    "5-4-mini": DEFAULT_MODEL,
    "4o-mini": LEGACY_FALLBACK_MODEL,
    "gpt-4o-mini": LEGACY_FALLBACK_MODEL,
    "gpt4o-mini": LEGACY_FALLBACK_MODEL,
  };

  return aliases[compact] || compact;
}

function getModel(): string {
  return normalizeModelName(process.env.OPENAI_MODEL);
}

function shouldUseResponsesApi(model: string): boolean {
  return model.startsWith("gpt-5") || model.startsWith("gpt-realtime");
}

function buildDemoReply(params: {
  memories: MemoryContext[];
  history: ChatMessage[];
  newUserMessage: string;
  attachments?: ImageAttachmentInput[];
}): string {
  const { memories, history, newUserMessage, attachments = [] } = params;
  const hasHistory = history.length > 0;
  const hasMemories = memories.length > 0;
  const hasAttachments = attachments.length > 0;

  return [
    "🟡 Demo mode is active. The assistant UI, conversations, image upload plumbing, app guidance plumbing, and database memory plumbing are working, but no real AI model is being called yet.",
    "",
    newUserMessage ? `Your message was: “${newUserMessage}”` : "Your message had no text.",
    hasAttachments ? `You attached ${attachments.length} image(s). Real visual analysis starts after OPENAI_API_KEY is configured.` : "",
    "",
    "What will happen after you add OPENAI_API_KEY:",
    "- this same chat will call the real OpenAI model",
    "- uploaded screenshots/photos will be sent to the model for visual analysis",
    "- the assistant will guide users inside the app using route/feature context",
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
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSystemContent(systemInstructions: string, memories: MemoryContext[]): string {
  const memorySection =
    memories.length > 0
      ? `\n\n## Relevant context from this user's previous conversations:\n${memories
          .map((m) => `- ${m.summary}`)
          .join("\n")}`
      : "";

  return `${systemInstructions}${memorySection}`;
}

function buildResponsesTextInput(
  history: ChatMessage[],
  newUserMessage: string
): string {
  const transcript = history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return [
    transcript ? `RECENT CHAT HISTORY:\n${transcript}` : "",
    `USER:\n${newUserMessage}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildResponsesMultimodalInput(params: {
  history: ChatMessage[];
  newUserMessage: string;
  attachments: ImageAttachmentInput[];
}) {
  const { history, newUserMessage, attachments } = params;
  const textWithHistory = buildResponsesTextInput(
    history,
    newUserMessage ||
      "Analyze the uploaded football analytics image/screenshot and explain the key insights."
  );

  // Keep Responses API multimodal input simple: one user item with transcript text
  // plus image parts. This avoids invalid assistant-role content parts in some
  // model/API combinations while preserving recent context.
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: textWithHistory,
        },
        ...attachments.map((attachment) => ({
          type: "input_image",
          image_url: attachment.dataUrl,
        })),
      ],
    },
  ];
}

function extractResponsesText(response: unknown): string {
  const maybe = response as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{ text?: unknown; type?: unknown }>;
    }>;
  };

  if (typeof maybe.output_text === "string") {
    return maybe.output_text.trim();
  }

  if (Array.isArray(maybe.output)) {
    return maybe.output
      .flatMap((item) => item.content || [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

function buildChatCompletionMessages(params: {
  systemContent: string;
  history: ChatMessage[];
  newUserMessage: string;
  attachments: ImageAttachmentInput[];
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const { systemContent, history, newUserMessage, attachments } = params;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map(
      (m): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: m.role,
        content: m.content,
      })
    ),
  ];

  if (attachments.length === 0) {
    messages.push({ role: "user", content: newUserMessage });
    return messages;
  }

  messages.push({
    role: "user",
    content: [
      {
        type: "text",
        text:
          newUserMessage ||
          "Analyze the uploaded football analytics image/screenshot and explain the key insights.",
      },
      ...attachments.map((attachment) => ({
        type: "image_url" as const,
        image_url: { url: attachment.dataUrl },
      })),
    ],
  });

  return messages;
}

function userFriendlyOpenAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "AI model call failed";

  if (/image|vision|input_image|unsupported/i.test(raw)) {
    return `Image analysis failed. Make sure OPENAI_MODEL supports vision, for example gpt-5.4-mini or gpt-5.5. Original error: ${raw}`;
  }

  if (/quota|billing|insufficient/i.test(raw)) {
    return `OpenAI billing/quota problem: ${raw}`;
  }

  if (/rate limit/i.test(raw)) {
    return `OpenAI rate limit problem: ${raw}`;
  }

  return raw;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateAssistantReply(params: {
  systemInstructions: string;
  memories: MemoryContext[];
  history: ChatMessage[];
  newUserMessage: string;
  attachments?: ImageAttachmentInput[];
}): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const {
    systemInstructions,
    memories,
    history,
    newUserMessage,
    attachments = [],
  } = params;

  // Demo/fallback mode: keep the chat feature usable without paid OpenAI API.
  if (isAiDemoModeEnabled()) {
    return {
      ok: true,
      text: buildDemoReply({ memories, history, newUserMessage, attachments }),
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

  const model = getModel();
  const systemContent = buildSystemContent(systemInstructions, memories);

  try {
    if (shouldUseResponsesApi(model)) {
      const response = await (client.responses as any).create({
        model,
        instructions: systemContent,
        input:
          attachments.length > 0
            ? buildResponsesMultimodalInput({
                history,
                newUserMessage,
                attachments,
              })
            : buildResponsesTextInput(history, newUserMessage),
        max_output_tokens: 1024,
      });

      const text = extractResponsesText(response);
      if (!text) {
        return { ok: false, message: "The AI model returned an empty response." };
      }
      return { ok: true, text };
    }

    const completion = await client.chat.completions.create({
      model,
      messages: buildChatCompletionMessages({
        systemContent,
        history,
        newUserMessage,
        attachments,
      }),
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
    return { ok: false, message: userFriendlyOpenAiError(err) };
  }
}
