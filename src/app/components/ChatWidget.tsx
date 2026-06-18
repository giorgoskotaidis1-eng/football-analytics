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
const MAX_COMPRESSED_IMAGE_BYTES = 650 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const TARGET_IMAGE_SIZES = [1600, 1200, 900, 700];
const JPEG_QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];

function isAllowedImageType(type: string): type is ImageMimeType {
  return ALLOWED_IMAGE_TYPES.includes(type as ImageMimeType);
}

function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function blobToDataUrl(blob: Blob): Promise<string> {
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
    reader.readAsDataURL(blob);
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image"));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: ImageMimeType,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to compress image"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function safeImageName(name: string, mimeType: ImageMimeType): string {
  const base = name.replace(/\.[^.]+$/, "").slice(0, 120) || "chat-image";
  const extension = mimeType === "image/webp" ? "webp" : "jpg";
  return `${base}.${extension}`;
}

async function compressImageFile(file: File): Promise<ChatAttachment> {
  const img = await loadImageFromFile(file);
  const outputType: ImageMimeType = file.type === "image/webp" ? "image/webp" : "image/jpeg";

  for (const maxSide of TARGET_IMAGE_SIZES) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToBlob(canvas, outputType, quality);
      const dataUrl = await blobToDataUrl(blob);
      const sizeBytes = dataUrlByteSize(dataUrl);

      if (sizeBytes <= MAX_COMPRESSED_IMAGE_BYTES) {
        return {
          type: "image",
          name: safeImageName(file.name, outputType),
          mimeType: outputType,
          sizeBytes,
          dataUrl,
        };
      }
    }
  }

  throw new Error("Image is still too large after compression");
}

// ─── ChatWidget ───────────────────────────────────────────────────────────────

export function ChatWidget() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // ── Conversations ────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [showConvList, setShowConvList] = useState(false);

  // ── Active chat ──────────────────────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Input ────────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnauthorized = useCallback(() => {
    toast.error(t("sessionExpiredPleaseLogin") || "Session expired. Please log in again.");
    router.push("/auth/login");
  }, [router, t]);

  // ─── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok || !data?.ok) return;
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      // silently ignore
    } finally {
      setLoadingConversations(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    if (open) {
      void loadConversations();
    }
  }, [open, loadConversations]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // ─── Open a conversation ─────────────────────────────────────────────────
  const openConversation = useCallback(async (id: number) => {
    setActiveConversationId(id);
    setShowConvList(false);
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

  // ─── New conversation ────────────────────────────────────────────────────
  function startNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
    setAttachments([]);
    setShowConvList(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    const availableSlots = MAX_IMAGE_ATTACHMENTS - attachments.length;

    if (availableSlots <= 0) {
      toast.error(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images per message.`);
      return;
    }

    const acceptedFiles = incoming.slice(0, availableSlots);
    if (incoming.length > acceptedFiles.length) {
      toast.error(`Only ${MAX_IMAGE_ATTACHMENTS} images can be attached per message.`);
    }

    const nextAttachments: ChatAttachment[] = [];
    setProcessingImages(true);
    const loadingToast = toast.loading("Preparing image for AI analysis...");

    try {
      for (const file of acceptedFiles) {
        if (!isAllowedImageType(file.type)) {
          toast.error(`${file.name} is not supported. Use JPG, PNG or WebP.`);
          continue;
        }

        if (file.size > MAX_SOURCE_IMAGE_BYTES) {
          toast.error(`${file.name} is too large. Use an image under 10MB.`);
          continue;
        }

        try {
          const compressed = await compressImageFile(file);
          nextAttachments.push(compressed);
        } catch {
          toast.error(`${file.name} could not be compressed enough. Try a smaller screenshot.`);
        }
      }
    } finally {
      toast.dismiss(loadingToast);
      setProcessingImages(false);
    }

    if (nextAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...nextAttachments]);
      toast.success(`${nextAttachments.length} image(s) ready for analysis.`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Send message ────────────────────────────────────────────────────────
  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    const outgoingAttachments = attachments;

    if ((!text && outgoingAttachments.length === 0) || sending || processingImages) return;

    setSending(true);
    const optimistic: ChatMessage = {
      role: "user",
      content: text || "[Image attached]",
      attachments: outgoingAttachments,
    };
    setMessages((prev) => [...prev, optimistic]);
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
        setMessages((prev) => prev.slice(0, -1));
        toast.error(data?.message || t("failedToSendMessage") || "Failed to send message");
        setInputValue(text);
        setAttachments(outgoingAttachments);
        return;
      }

      if (!activeConversationId) {
        setActiveConversationId(data.conversationId);
        await loadConversations();
      } else {
        void loadConversations();
      }

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

  // ─── Delete conversation ─────────────────────────────────────────────────
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
      if (activeConversationId === id) startNewConversation();
      await loadConversations();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    }
  }

  // ─── Clear all ───────────────────────────────────────────────────────────
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

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("closeAiAssistant") : t("openAiAssistant")}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl shadow-lg ring-2 ring-emerald-400/40 transition hover:bg-emerald-400 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Popup panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl sm:w-96"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <span className="text-[12px] font-semibold text-slate-100">
                {t("aiAssistant") || "AI Assistant"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* History toggle */}
              <button
                onClick={() => setShowConvList((v) => !v)}
                className="rounded-md px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                title={t("conversationHistory") || "Conversation history"}
              >
                🕐
              </button>
              {/* New chat */}
              <button
                onClick={startNewConversation}
                className="rounded-md px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-slate-800"
                title={t("newChat") || "New chat"}
              >
                + {t("new") || "New"}
              </button>
            </div>
          </div>

          {/* Conversation list panel (slide-in) */}
          {showConvList ? (
            <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
              <div className="flex-1 overflow-y-auto py-1">
                {loadingConversations ? (
                  <p className="px-3 py-2 text-[11px] text-slate-500">{t("loading") || "Loading..."}</p>
                ) : conversations.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-slate-500">{t("noConversationsYet") || "No conversations yet."}</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex cursor-pointer items-center justify-between gap-1 px-3 py-2 hover:bg-slate-800/60 ${
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
              <div className="border-t border-slate-800 px-3 py-2">
                <button
                  onClick={() => void handleClearAll()}
                  className="w-full rounded-md border border-slate-700 px-2 py-1.5 text-[10px] text-slate-400 hover:border-red-500/50 hover:text-red-400"
                >
                  {t("clearAllMemory") || "Clear all history & memory"}
                </button>
              </div>
            </div>
          ) : (
            /* Chat area */
            <>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {messages.length === 0 && !loadingMessages && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="text-3xl">🤖</span>
                    <p className="mt-2 text-[12px] font-medium text-slate-300">
                      {t("assistantWelcome") || "How can I help you today?"}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {t("assistantExamples") || "Ask about stats, tactics, match data, or attach a screenshot."}
                    </p>
                  </div>
                )}

                {loadingMessages && (
                  <p className="text-center text-[11px] text-slate-500">{t("loading") || "Loading..."}</p>
                )}

                {messages.map((msg, idx) => (
                  <WidgetMessageBubble key={msg.id ?? `opt-${idx}`} message={msg} />
                ))}

                {/* Typing indicator */}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 px-3 py-2">
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <form
                onSubmit={(e) => void handleSend(e)}
                className="space-y-2 border-t border-slate-800 px-2 py-2"
              >
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={`${attachment.name}-${index}`}
                        className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                      >
                        <img
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          className="h-16 w-16 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          disabled={sending || processingImages}
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
                    onChange={(event) => void handleFileChange(event.target.files)}
                  />

                  <button
                    type="button"
                    disabled={sending || processingImages || attachments.length >= MAX_IMAGE_ATTACHMENTS}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-base text-slate-100 hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Attach image or screenshot"
                    aria-label="Attach image or screenshot"
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
                      processingImages
                        ? "Preparing image..."
                        : t("typeYourMessage") || "Type a message… (Enter to send)"
                    }
                    rows={1}
                    maxLength={4000}
                    disabled={sending || processingImages}
                    className="min-h-[34px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 disabled:opacity-60"
                    style={{ maxHeight: "6rem", overflowY: "auto" }}
                  />
                  <button
                    type="submit"
                    disabled={sending || processingImages || !canSend}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    title={t("send") || "Send"}
                  >
                    ↑
                  </button>
                </div>

                <p className="text-[9px] text-slate-500">
                  Attach JPG, PNG or WebP screenshots. Up to {MAX_IMAGE_ATTACHMENTS} compressed images.
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WidgetMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
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
                className="max-h-44 max-w-full rounded-lg border border-slate-700 object-contain"
              />
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.createdAt && (
          <p className={`mt-0.5 text-[9px] ${isUser ? "text-emerald-900/60" : "text-slate-500"}`}>
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

function TypingDots() {
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
