"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type Ticket = {
  id: number;
  subject: string;
  body: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Priority = "normal" | "high" | "critical";

const PRIORITY_OPTIONS: Array<{ value: Priority; labelKey: string; fallback: string }> = [
  { value: "normal", labelKey: "priorityNormal", fallback: "Normal" },
  { value: "high", labelKey: "priorityHigh", fallback: "High" },
  { value: "critical", labelKey: "priorityCritical", fallback: "Critical (production)" },
];

function priorityBadgeClass(priority: string): string {
  if (priority === "critical") return "border-red-500/50 bg-red-500/10 text-red-300";
  if (priority === "high") return "border-amber-500/50 bg-amber-500/10 text-amber-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function statusBadgeClass(status: string): string {
  if (status === "resolved") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
  if (status === "in_progress") return "border-blue-500/50 bg-blue-500/10 text-blue-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

export default function SupportPage() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToLoadTickets") || "Failed to load tickets");
        setTickets([]);
        return;
      }
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch {
      toast.error(t("failedToLoadTickets") || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [t]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error(t("fillSubjectAndDetails") || "Please fill in subject and details");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), priority }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToSubmitTicket") || "Failed to submit ticket");
        return;
      }
      toast.success(t("ticketSubmitted") || "Ticket submitted");
      setSubject("");
      setBody("");
      setPriority("normal");
      await loadTickets();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] text-xs text-slate-200">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t("helpCenter") || "Help center"}
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">
              {t("supportAndFeedback") || "Support & feedback"}
            </h1>
            <p className="text-[11px] text-slate-500">
              {t("supportPageDescription") ||
                "Send us details about an issue you're facing or a request you have."}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-[11px] font-medium text-slate-300">
              {t("popularTopics") || "Popular topics"}
            </p>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li>• {t("topicUploadMatch") || "How to upload and tag a new match."}</li>
              <li>• {t("topicInviteStaff") || "Inviting staff and assigning roles."}</li>
              <li>• {t("topicExports") || "Exporting match data to CSV or API."}</li>
              <li>• {t("topicBilling") || "Managing subscription and invoices."}</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-[11px] font-medium text-slate-300">
              {t("reportAnIssue") || "Report an issue"}
            </p>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">{t("subject") || "Subject"}</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  placeholder={t("shortSummary") || "Short summary"}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">{t("details") || "Details"}</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  placeholder={
                    t("ticketDetailsPlaceholder") ||
                    "Describe what happened, steps to reproduce and any error messages."
                  }
                  maxLength={4000}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">{t("priority") || "Priority"}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey) || opt.fallback}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("submitting") || "Submitting..." : t("submitTicket") || "Submit ticket"}
              </button>
            </form>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-300">{t("myTickets") || "My tickets"}</p>
              <p className="text-[10px] text-slate-500">{tickets.length}</p>
            </div>
            {loadingTickets ? (
              <p className="text-[11px] text-slate-500">{t("loading")}</p>
            ) : tickets.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {t("noTicketsYet") || "No tickets yet. Submit your first one above."}
              </p>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-slate-100 truncate">{ticket.subject}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{ticket.body}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(
                            ticket.status
                          )}`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <p className="font-medium">{t("supportHours") || "Support hours"}</p>
          <p className="text-slate-500">
            {t("supportHoursDescription") ||
              "Our team reviews tickets during normal business hours and on match weekends."}
          </p>
          <p className="font-medium pt-2">{t("ticketPriorities") || "Priorities"}</p>
          <ul className="space-y-1 text-slate-500">
            <li>
              <span className="text-slate-200">Normal</span> —{" "}
              {t("priorityNormalDesc") || "general questions and feature requests."}
            </li>
            <li>
              <span className="text-amber-300">High</span> —{" "}
              {t("priorityHighDesc") || "blocking workflow issues."}
            </li>
            <li>
              <span className="text-red-300">Critical</span> —{" "}
              {t("priorityCriticalDesc") || "production outage; matches cannot be analyzed."}
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
