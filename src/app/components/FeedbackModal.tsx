"use client";

import { useState, FormEvent, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSuccess?: () => void;
}

export function FeedbackModal({ isOpen, onClose, onFeedbackSuccess }: FeedbackModalProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/players")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setPlayers(data.players || []);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!playerId) {
      toast.error(t("pleaseSelectAPlayer"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/player-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: parseInt(playerId),
          strengths: strengths.split("\n").filter((s) => s.trim()),
          improvements: improvements.split("\n").filter((s) => s.trim()),
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(t("feedbackSavedSuccessfully"));
        onFeedbackSuccess?.();
        onClose();
        // Reset form
        setPlayerId("");
        setStrengths("");
        setImprovements("");
      } else {
        toast.error(data.message || t("failedToSaveFeedback"));
      }
    } catch (error) {
      toast.error(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 text-xs text-text shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-text transition text-xl font-bold leading-none"
        >
          ×
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text">{t("newPlayerNote")}</h2>
          <p className="text-[11px] text-muted mt-1">
            {t("addFeedbackAndNotes")}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[11px] text-text">{t("playerName")} *</label>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-card px-2 text-[11px] text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/60"
              required
            >
              <option value="">{t("selectAPlayer")}</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} - {player.position} ({player.club || player.team?.name || t("noTeam")})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-text">{t("strengths")}</label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-card px-2 py-2 text-[11px] text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/60 resize-none"
              placeholder={t("enterStrengths")}
            />
            <p className="text-[10px] text-muted">{t("oneStrengthPerLine")}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-text">{t("focusForNextBlock")}</label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-card px-2 py-2 text-[11px] text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/60 resize-none"
              placeholder={t("enterAreasForImprovement")}
            />
            <p className="text-[10px] text-muted">{t("oneImprovementPerLine")}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-md border border-border bg-card text-[11px] font-semibold text-text hover:opacity-80 transition"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-9 rounded-md bg-accent text-[11px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {submitting ? t("saving") : t("saveFeedback")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}







