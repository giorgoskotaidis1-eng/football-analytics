/**
 * Memory management — per-user MemoryItem retrieval and periodic
 * conversation summarisation.
 *
 * Relevance scoring uses keyword overlap + importanceScore + recency.
 *
 * EXTENSION POINT: To switch to semantic (vector-embedding) retrieval,
 * replace the `scoreRelevance` function below with one that calls
 * openai.embeddings.create(), stores embeddings alongside MemoryItems,
 * and computes cosine similarity here.
 */
import { prisma } from "@/lib/prisma";
import { generateAssistantReply } from "./chat";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * After every SUMMARIZE_EVERY messages in a conversation, the assistant
 * distils useful long-term information into a new MemoryItem.
 */
const SUMMARIZE_EVERY = 6;

/**
 * How many MemoryItems to load as candidates before scoring.
 * Keeps the scoring pool small and fast.
 */
const CANDIDATE_POOL = 50;

// ─── Sensitive-data redaction ────────────────────────────────────────────────

/**
 * Patterns that indicate potentially sensitive data that must NOT be stored.
 * Applied before writing any MemoryItem summary to the database.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  // Generic "key = value" credentials
  /(?:password|passwd|secret|token|api[-_]?key|private[-_]?key|bearer|credential)[\s:='"]+\S+/gi,
  // OpenAI / Anthropic / provider keys
  /sk-[a-zA-Z0-9_-]{20,}/g,
  // GitHub personal access tokens
  /ghp_[a-zA-Z0-9]{36,}/g,
  // JWTs (base64url header present)
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  // Generic hex secrets ≥ 32 chars
  /\b[0-9a-fA-F]{32,}\b/g,
];

/**
 * Replaces any detected sensitive fragments with [REDACTED].
 */
function redactSensitiveData(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

// ─── Relevance scoring ───────────────────────────────────────────────────────

/** Milliseconds per day — extracted to avoid redundant arithmetic in the scoring loop. */
const MS_PER_DAY = 86_400_000;

/**
 * Computes a composite relevance score for a MemoryItem against a user query.
 *
 * EXTENSION POINT: Replace this function with cosine similarity over stored
 * embeddings (e.g. text-embedding-3-small via OpenAI) when you want semantic
 * rather than keyword-based retrieval.
 *
 * Current weights:
 *  - 60 % keyword overlap between query terms and memory summary
 *  - 25 % normalised importanceScore (0–10 scale)
 *  - 15 % recency (exponential decay, half-life ≈ 30 days)
 */
function scoreRelevance(
  summary: string,
  query: string,
  importanceScore: number,
  createdAt: Date,
  now: number
): number {
  // Tokenise query: only terms longer than 2 characters
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const summaryLower = summary.toLowerCase();

  const overlap =
    queryTerms.length === 0
      ? 0
      : queryTerms.filter((term) => summaryLower.includes(term)).length /
        queryTerms.length;

  // Recency: exponential decay over 30-day half-life
  const ageDays = (now - createdAt.getTime()) / MS_PER_DAY;
  const recency = Math.exp(-ageDays / 30);

  return overlap * 0.6 + (importanceScore / 10) * 0.25 + recency * 0.15;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the most relevant MemoryItems for a given user and query.
 *
 * Results are ALWAYS scoped to `userId` — no cross-user data ever leaks.
 *
 * @param userId - The authenticated user's id.
 * @param query  - The user's current message (used for relevance scoring).
 * @param limit  - Maximum number of memories to return (default: 5).
 */
export async function getRelevantMemories(
  userId: number,
  query: string,
  limit = 5
): Promise<Array<{ summary: string; importanceScore: number }>> {
  // Load the best candidate pool for this user only
  const candidates = await prisma.memoryItem.findMany({
    where: { userId },
    orderBy: [{ importanceScore: "desc" }, { createdAt: "desc" }],
    take: CANDIDATE_POOL,
    select: { id: true, summary: true, importanceScore: true, createdAt: true },
  });

  if (candidates.length === 0) return [];

  // Pre-compute current timestamp once to avoid repeated Date.now() calls
  const now = Date.now();

  // Score, sort descending, and return top N
  return candidates
    .map((item) => ({
      summary: item.summary,
      importanceScore: item.importanceScore,
      score: scoreRelevance(
        item.summary,
        query,
        item.importanceScore,
        item.createdAt,
        now
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ summary, importanceScore }) => ({ summary, importanceScore }));
}

/**
 * After every SUMMARIZE_EVERY messages in the conversation, asks the AI
 * to extract durable facts and stores them as a MemoryItem.
 *
 * - Never stores small-talk or ephemeral data.
 * - Redacts passwords, tokens, and other sensitive patterns before persisting.
 * - Memory is always scoped to the originating userId.
 *
 * Callers MUST wrap this in try/catch — failures here must not break the
 * user-visible chat response.
 *
 * @param userId         - Owner of the conversation.
 * @param conversationId - The conversation to inspect.
 */
export async function maybeSummarizeConversation(
  userId: number,
  conversationId: number
): Promise<void> {
  const count = await prisma.chatMessage.count({
    where: { conversationId },
  });

  // Only summarise at each SUMMARIZE_EVERY threshold
  if (count === 0 || count % SUMMARIZE_EVERY !== 0) return;

  // Fetch the most recent SUMMARIZE_EVERY messages
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    skip: count - SUMMARIZE_EVERY,
    take: SUMMARIZE_EVERY,
    select: { id: true, role: true, content: true },
  });

  if (messages.length === 0) return;

  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const result = await generateAssistantReply({
    systemInstructions: [
      "You are a memory-extraction assistant.",
      "Read the conversation excerpt and extract ONLY durable, long-term-useful facts about the user.",
      "Useful examples: user's team name, preferred analytics metrics, recurring problems they face, stated preferences.",
      "DO NOT include: greetings, one-off questions, temporary information, small-talk.",
      "DO NOT include: passwords, API keys, tokens, secrets, or any sensitive credentials.",
      "Output 1–3 concise plain-text bullet points (no markdown).",
      "If there is nothing worth remembering, output exactly: NOTHING_TO_REMEMBER",
    ].join("\n"),
    memories: [],
    history: [],
    newUserMessage: `Conversation excerpt to analyse:\n${transcript}`,
  });

  // Use `in` narrowing — tsconfig strict:false means boolean discriminants
  // are not reliably narrowed without strictNullChecks.
  const summaryText = "text" in result ? result.text : null;
  if (!summaryText) {
    const errMsg = "message" in result ? result.message : "AI error";
    console.error("[ai/memory] Summarisation failed:", errMsg);
    return;
  }

  const rawSummary = summaryText.trim();

  // The model signalled there is nothing useful to remember
  if (
    rawSummary === "NOTHING_TO_REMEMBER" ||
    rawSummary.length < 5
  ) {
    return;
  }

  // Redact any sensitive patterns before persisting
  const summary = redactSensitiveData(rawSummary);

  await prisma.memoryItem.create({
    data: {
      userId,
      summary,
      sourceMessageIds: JSON.stringify(messages.map((m) => m.id)),
      importanceScore: 5, // TODO: adjust via user feedback mechanism (future enhancement)
    },
  });
}
