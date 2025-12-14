"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

type Message = {
  id: number;
  fromUserId: number;
  toUserId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  fromUser?: { name: string | null; email: string };
  toUser?: { name: string | null; email: string };
};

export default function MessageThreadPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/messages?threadId=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.messages) {
            setMessages(data.messages);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [id]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !id) return;
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: parseInt(id),
          body: body.trim(),
        }),
      });
      setBody("");
      // Reload messages
      const res = await fetch(`/api/messages?threadId=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.messages) {
          setMessages(data.messages);
        }
      }
    } catch {
      // ignore errors
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 text-xs text-slate-200">
      <header className="flex items-center justify-between rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Staff messaging</p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">Thread #{id}</h1>
        </div>
        <div className="hidden items-center gap-2 text-[10px] text-slate-400 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Live collaboration</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-800 bg-slate-950/80">
        <div className="flex-1 space-y-2 overflow-y-auto p-3 text-[11px] text-slate-300">
          {loading ? (
            <p className="text-[10px] text-slate-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-[10px] text-slate-500">No messages yet in this thread. Start the conversation!</p>
          ) : (
            messages.map((m) => {
              const isFromCurrentUser = m.fromUser?.email === "current"; // TODO: Get from session
              return (
                <div key={m.id} className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] space-y-1 rounded-lg border px-3 py-2 text-[11px] ${
                      isFromCurrentUser
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-50"
                        : "border-slate-800 bg-slate-950 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate pr-2">{m.fromUser?.name || m.fromUser?.email || "User"}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[11px]">{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-slate-800 bg-slate-950/90 p-3 text-[11px] text-slate-200"
        >
          <label className="mb-1 block text-[10px] text-slate-400">New message</label>
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-[60px] flex-1 rounded-md border border-slate-800 bg-slate-900 p-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share tactical notes, clip IDs or xG/xA insights with your staff..."
            />
            <button
              type="submit"
              className="h-9 rounded-md bg-emerald-500 px-4 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
