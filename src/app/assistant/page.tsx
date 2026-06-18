"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

interface ChatAttachment {
  type: "image";
  name: string;
  mimeType: ImageMimeType;
  sizeBytes: number;
  dataUrl: string;
}

interface ChatMessage {
  id?: number;
  role: MessageRole;
  content: string;
  createdAt?: string;
  attachments?: ChatAttachment[];
}

interface Conversation {
  id: number;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_IMAGE_TYPES: ImageMimeType[] = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_ATTACHMENTS = 3;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function isAllowedImageType(type: string): type is ImageMimeType {
  return ALLOWED_IMAGE_TYPES.includes(type as ImageMimeType);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Invalid file result"));
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Conversations sidebar state ──────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // ── Active chat state ────────────────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Input state ──────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnauthorized = useCallback(() => {
    toast.error(t("sessionExpiredPleaseLogin") || "Session expired. Please log in again.");
    router.push("/auth/login");
  }, [router, t]);

  // ─── Load conversation list ─────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
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
  }, [handleUnauthorized]);

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
    setAttachments([]);
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
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
  }, [handleUnauthorized, t]);

  // ─── Start a new conversation ───────────────────────────────────────────

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;

    const existing = attachments.length;
    const incoming = Array.from(files);
    const availableSlots = MAX_IMAGE_ATTACHMENTS - existing;

    if (availableSlots <= 0) {
      toast.error(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images per message.`);
      return;
    }

    const acceptedFiles = incoming.slice(0, availableSlots);
    if (incoming.length > acceptedFiles.length) {
      toast.error(`Only ${MAX_IMAGE_ATTACHMENTS} images can be attached per message.`);
    }

    const nextAttachments: ChatAttachment[] = [];

    for (const file of acceptedFiles) {
      if (!isAllowedImageType(file.type)) {
        toast.error(`${file.name} is not supported. Use JPG, PNG or WebP.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`${file.name} is too large. Max size is 5MB.`);
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        nextAttachments.push({
          type: "image",
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl,
        });
      } catch {
        toast.error(`Unable to read ${file.name}.`);
      }
    }

    if (nextAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...nextAttachments]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Send a message ─────────────────────────────────────────────────────

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    const outgoingAttachments = attachments;

    if ((!text && outgoingAttachments.length === 0) || sending) return;

    setSending(true);

    // Optimistically add user message
    const optimisticUser: ChatMessage = {
      role: "user",
      content: text || "[Image attached]",
      attachments: outgoingAttachments,
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInputValue("");
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConversationId ?? undefined,
          attachments: outgoingAttachments,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setMessages((prev) => prev.slice(0, -1));
        setInputValue(text);
        setAttachments(outgoingAttachments);
        handleUnauthorized();
        return;
      }

      if (!res.ok || !data?.ok) {
        // Remove the optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
        toast.error(data?.message || t("failedToSendMessage") || "Failed to send message");
        setInputValue(text);
        setAttachments(outgoingAttachments);
        return;
      }

      // If this was a new conversation, set it active and refresh sidebar
      if (!activeConversationId) {
        setActiveConversationId(data.conversationId);
        await loadConversations();
      } else {
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
      setAttachments(outgoingAttachments);
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
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
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
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
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

  const canSend = inputValue.trim().length > 0 || attachments.length > 0;

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
            "Ask questions about your data, upload screenshots, get tactical insights, and analyse match statistics."}
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
                  className={`group flex cursor-pointer items-center justify-between gap-1 px-3 py-2 hover:bg-slate-800/50 ${
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
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !loadingMessages && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="text-4xl">🤖</span>
                <p className="mt-3 text-[13px] font-medium text-slate-300">
                  {t("assistantWelcome") || "How can I help you today?"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t("assistantExamples") ||
                    "Ask about stats, tactics, match data, or upload a screenshot."}
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
            className="space-y-2 border-t border-slate-800 px-3 py-3"
          >
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.name}-${index}`}
                    className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                  >
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      className="h-20 w-20 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      disabled={sending}
                      className="absolute right-1 top-1 rounded-full bg-slate-950/80 px-1.5 text-[10px] text-slate-100 hover:bg-red-500"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => void handleFileChange(e.target.files)}
              />

              <button
                type="button"
                disabled={sending || attachments.length >= MAX_IMAGE_ATTACHMENTS}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 shrink-0 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                title="Attach image"
              >
                📎
              </button>

              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend(e as unknown as FormEvent);
                  }
                }}
                placeholder={
                  t("typeYourMessage") ||
                  "Type a message or attach an image… (Enter to send)"
                }
                rows={1}
                maxLength={4000}
                disabled={sending}
                className="min-h-[36px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 disabled:opacity-60"
                style={{ maxHeight: "8rem", overflowY: "auto" }}
              />
              <button
                type="submit"
                disabled={sending || !canSend}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-base text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                title={t("send") || "Send"}
              >
                ↑
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              JPG, PNG or WebP. Up to {MAX_IMAGE_ATTACHMENTS} images, 5MB each.
            </p>
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
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <img
                key={`${attachment.name}-${index}`}
                src={attachment.dataUrl}
                alt={attachment.name}
                className="max-h-56 max-w-full rounded-lg border border-slate-700 object-contain"
              />
            ))}
          </div>
        )}
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
