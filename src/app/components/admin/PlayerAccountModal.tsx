"use client";

import { useState } from "react";

type Player = {
  id: number;
  name: string;
  team?: { id: number; name: string } | null;
  email?: string | null;
};

interface PlayerAccountModalProps {
  player: Player;
  onClose: () => void;
  onSaved?: () => void;
}

export function PlayerAccountModal({ player, onClose, onSaved }: PlayerAccountModalProps) {
  const [email, setEmail] = useState<string>(player.email || "");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!email.trim() || !password.trim()) {
        setError("Email και κωδικός είναι απαραίτητα.");
        return;
      }

      if (password.length < 6) {
        setError("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.");
        return;
      }

      if (confirmPassword && password !== confirmPassword) {
        setError("Οι κωδικοί δεν ταιριάζουν.");
        return;
      }

      const res = await fetch(`/api/admin/player-accounts/${player.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Αποτυχία αποθήκευσης λογαριασμού παίκτη.");
        return;
      }

      setSuccess("Ο λογαριασμός παίκτη αποθηκεύτηκε επιτυχώς.");
      if (onSaved) onSaved();
      setTimeout(onClose, 1200);
    } catch (e) {
      console.error("[PlayerAccountModal] Save error", e);
      setError("Απρόσμενο σφάλμα. Προσπάθησε ξανά.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h8"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Λογαριασμός παίκτη</h2>
              <p className="text-[11px] text-slate-400">
                {player.name} {player.team?.name ? `· ${player.team.name}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-300">Email παίκτη</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              placeholder="player@example.com"
            />
            <p className="text-[10px] text-slate-500">
              Αυτό είναι το email που θα χρησιμοποιεί ο παίκτης για σύνδεση στο `/auth/login`.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-300">Κωδικός</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Νέος κωδικός για τον παίκτη"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-300">Επιβεβαίωση κωδικού</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Επανάληψη κωδικού"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/60 hover:border-slate-600/50"
            disabled={saving}
          >
            Άκυρο
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Αποθήκευση..." : "Αποθήκευση λογαριασμού"}
          </button>
        </div>
      </div>
    </div>
  );
}






