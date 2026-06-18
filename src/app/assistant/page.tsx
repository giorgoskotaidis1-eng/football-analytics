"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id?: number;
  role: MessageRole;
  content: string;
  createdAt?: string;
}

interface Conversation {
  id: number;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { t } = useTranslation();

  // ── Conversations sidebar state ──────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // ── Active chat state ────────────────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Input state ──────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  // ── Scroll anchor ────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Load conversation list ─────────────────────────────────────────────
  // `t` is intentionally NOT in the dependency array — the translation function
  // reference may change on re-render (language toggle), which would trigger
  // unnecessary refetches. Error messages use stable inline fallbacks instead.
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || "Failed to load conversations");
        return;
      }
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoadingConversations(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // ─── Scroll to bottom whenever messages change ──────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Open a conversation ────────────────────────────────────────────────

  const openConversation = useCallback(async (id: number) => {
    setActiveConversationId(id);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToLoadMessages") || "Failed to load messages");
        return;
      }
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setLoadingMessages(false);
    }
  }, [t]);

  // ─── Start a new conversation ───────────────────────────────────────────

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
  }

  // ─── Send a message ─────────────────────────────────────────────────────

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);

    // Optimistically add user message
    const optimisticUser: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, optimisticUser]);
    setInputValue("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConversationId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // Remove the optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
        toast.error(data?.message || t("failedToSendMessage") || "Failed to send message");
        setInputValue(text); // restore input
        return;
      }

      // If this was a new conversation, set it active and refresh sidebar
      if (!activeConversationId) {
        setActiveConversationId(data.conversationId);
        await loadConversations();
      } else {
        // Re-fetch conversation list so updatedAt comes from the server
        // (avoids client-side clock skew affecting sidebar sort order).
        void loadConversations();
      }

      // Append the assistant message
      if (data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      toast.error(t("anErrorOccurred") || "An error occurred");
      setInputValue(text);
    } finally {
      setSending(false);
    }
  }

  // ─── Delete a conversation ──────────────────────────────────────────────

  async function handleDeleteConversation(id: number) {
    if (!confirm(t("confirmDeleteConversation") || "Delete this conversation?")) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToDelete") || "Failed to delete");
        return;
      }
      toast.success(t("conversationDeleted") || "Conversation deleted");
      if (activeConversationId === id) {
        startNewConversation();
      }
      await loadConversations();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    }
  }

  // ─── Clear memory / all history ─────────────────────────────────────────

  async function handleClearAll() {
    if (
      !confirm(
        t("confirmClearAll") ||
          "Clear all chat history and AI memory? This cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch("/api/chat/memories?all=true", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToClearMemory") || "Failed to clear memory");
        return;
      }
      toast.success(t("memoryClearedAll") || "History and memory cleared");
      startNewConversation();
      await loadConversations();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Toaster position="top-right" />

      {/* Page header */}
      <div className="mb-4 space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {t("aiAssistant") || "AI Assistant"}
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          {t("footballAnalyticsAssistant") || "Football Analytics Assistant"}
        </h1>
        <p className="text-[11px] text-slate-500">
          {t("assistantDescription") ||
            "Ask questions about your data, get tactical insights, and analyse match statistics."}
        </p>
      </div>

      {/* Main layout: sidebar + chat area */}
      <div className="flex h-[calc(100vh-13rem)] gap-4 overflow-hidden">

        {/* ── Conversation sidebar ────────────────────────────────────────── */}
        <aside className="hidden w-56 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 md:flex">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-slate-300">
              {t("conversations") || "Conversations"}
            </p>
            <button
              onClick={startNewConversation}
              className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400"
              title={t("newChat") || "New chat"}
            >
              + {t("new") || "New"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {loadingConversations ? (
              <p className="px-3 py-2 text-[11px] text-slate-500">
                {t("loading") || "Loading..."}
              </p>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-slate-500">
                {t("noConversationsYet") || "No conversations yet."}
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between gap-1 px-3 py-2 cursor-pointer hover:bg-slate-800/50 ${
                    activeConversationId === conv.id
                      ? "border-l-2 border-emerald-500 bg-slate-800/40"
                      : ""
                  }`}
                  onClick={() => void openConversation(conv.id)}
                >
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                    {conv.title || t("untitledChat") || "Untitled chat"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteConversation(conv.id);
                    }}
                    className="hidden shrink-0 text-[10px] text-slate-500 hover:text-red-400 group-hover:block"
                    title={t("delete") || "Delete"}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Clear all button */}
          <div className="border-t border-slate-800 px-3 py-2">
            <button
              onClick={() => void handleClearAll()}
              className="w-full rounded-md border border-slate-700 px-2 py-1.5 text-[10px] text-slate-400 hover:border-red-500/50 hover:text-red-400"
            >
              {t("clearAllMemory") || "Clear all history & memory"}
            </button>
          </div>
        </aside>

        {/* ── Chat area ──────────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && !loadingMessages && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="text-4xl">🤖</span>
                <p className="mt-3 text-[13px] font-medium text-slate-300">
                  {t("assistantWelcome") || "How can I help you today?"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t("assistantExamples") ||
                    "Try: \"Show me top scorers\" or \"Explain high press tactics\""}
                </p>
              </div>
            )}

            {loadingMessages && (
              <p className="text-[11px] text-slate-500">
                {t("loading") || "Loading..."}
              </p>
            )}

            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id ?? `opt-${idx}`} message={msg} />
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 px-4 py-2.5">
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => void handleSend(e)}
            className="flex items-end gap-2 border-t border-slate-800 px-3 py-3"
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend(e as unknown as FormEvent);
                }
              }}
              placeholder={t("typeYourMessage") || "Type a message… (Enter to send)"}
              rows={1}
              maxLength={4000}
              disabled={sending}
              className="min-h-[36px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 disabled:opacity-60"
              style={{ maxHeight: "8rem", overflowY: "auto" }}
            />
            <button
              type="submit"
              disabled={sending || !inputValue.trim()}
              className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center text-base"
              title={t("send") || "Send"}
            >
              ↑
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-emerald-500/90 text-slate-950"
            : "rounded-tl-sm border border-slate-700 bg-slate-800 text-slate-100"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.createdAt && (
          <p
            className={`mt-1 text-[10px] ${
              isUser ? "text-emerald-900/60" : "text-slate-500"
            }`}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}
