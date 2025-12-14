"use client";

import { FormEvent, useState } from "react";
import { PitchPositionSelector } from "./PitchPositionSelector";

interface MatchEventFormProps {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  players: Array<{ id: number; name: string }>;
  onEventAdded?: () => void;
}

export function MatchEventForm({ matchId, homeTeamName, awayTeamName, players, onEventAdded }: MatchEventFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "shot",
    team: "home",
    playerId: "",
    x: "",
    y: "",
    minute: "",
    shotType: "open_play",
    bodyPart: "foot",
    outcome: "",
    successful: "true",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const metadata: Record<string, any> = {};
      
      if (formData.type === "shot") {
        metadata.shotType = formData.shotType;
        metadata.bodyPart = formData.bodyPart;
        if (formData.outcome) metadata.outcome = formData.outcome;
      } else if (formData.type === "pass") {
        metadata.successful = formData.successful === "true";
      }

      const res = await fetch(`/api/matches/${matchId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          team: formData.team,
          playerId: formData.playerId ? parseInt(formData.playerId) : undefined,
          x: formData.x ? parseFloat(formData.x) : undefined,
          y: formData.y ? parseFloat(formData.y) : undefined,
          minute: formData.minute ? parseInt(formData.minute) : undefined,
          metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Failed to add event");
        return;
      }

      // Reset form
      setFormData({
        type: "shot",
        team: "home",
        playerId: "",
        x: "",
        y: "",
        minute: "",
        shotType: "open_play",
        bodyPart: "foot",
        outcome: "",
        successful: "true",
      });
      
      setShowForm(false);
      if (onEventAdded) onEventAdded();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="h-8 rounded-md bg-emerald-500 px-4 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
      >
        Add Match Event
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-800 bg-slate-950 p-4 text-[11px]">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-200">Add Match Event</p>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-[10px] text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-slate-400">Event Type</label>
          <select
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            <option value="shot">Shot</option>
            <option value="pass">Pass</option>
            <option value="touch">Touch</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-400">Team</label>
          <select
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            required
          >
            <option value="home">{homeTeamName} (Home)</option>
            <option value="away">{awayTeamName} (Away)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-400">Player (optional)</label>
          <select
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={formData.playerId}
            onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-400">Minute</label>
          <input
            type="number"
            min="0"
            max="120"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={formData.minute}
            onChange={(e) => setFormData({ ...formData, minute: e.target.value })}
            placeholder="e.g. 23"
          />
        </div>

        {/* Interactive Pitch Position Selector */}
        <div className="md:col-span-2">
          <PitchPositionSelector
            x={formData.x ? parseFloat(formData.x) : null}
            y={formData.y ? parseFloat(formData.y) : null}
            onPositionChange={(x, y) => {
              setFormData({ ...formData, x: x.toString(), y: y.toString() });
            }}
            team={formData.team as "home" | "away"}
          />
        </div>
      </div>

      {formData.type === "shot" && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-slate-400">Shot Type</label>
            <select
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              value={formData.shotType}
              onChange={(e) => setFormData({ ...formData, shotType: e.target.value })}
            >
              <option value="open_play">Open Play</option>
              <option value="set_piece">Set Piece</option>
              <option value="penalty">Penalty</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-400">Body Part</label>
            <select
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              value={formData.bodyPart}
              onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
            >
              <option value="foot">Foot</option>
              <option value="head">Head</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-400">Outcome (optional)</label>
            <select
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="goal">Goal</option>
              <option value="saved">Saved</option>
              <option value="blocked">Blocked</option>
              <option value="off_target">Off Target</option>
              <option value="post">Post</option>
            </select>
          </div>
        </div>
      )}

      {formData.type === "pass" && (
        <div className="space-y-1.5">
          <label className="text-slate-400">Successful</label>
          <select
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={formData.successful}
            onChange={(e) => setFormData({ ...formData, successful: e.target.value })}
          >
            <option value="true">Successful</option>
            <option value="false">Unsuccessful</option>
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-8 flex-1 rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add Event"}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="h-8 rounded-md border border-slate-700 bg-slate-900 px-4 text-[11px] text-slate-200 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

