"use client";

import React, { useMemo, useState, useEffect } from "react";
import { EventItem, LineupEntry } from "../types/spotlight";
import { buildLineupMap } from "../lib/buildLineupMap";
import { VideoPlayer } from "./VideoPlayer";
import { EventList } from "./EventList";
import { Pitch } from "./Pitch";
import { postprocessEvents, RawEvent } from "@/services/events/postprocessEvents";
import { parseApiResponseJson } from "@/lib/parse-api-response";
import toast from "react-hot-toast";

interface SpotlightProps {
  events: EventItem[];
  matchId: number;
  videoUrl?: string | null; // Main match video URL (for fallback)
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  formation?: string;
  initialMinute?: number;
  /**
   * Total video duration in seconds. Used by event post-processing windowing.
   * If omitted we estimate from the events themselves (max timeSec × 1.1)
   * with a final fallback of 90 minutes so we never under-window real matches.
   */
  videoDurationSec?: number;
}

type PlaylistOption = { id: number; name: string };

/** Safety net: a full football match never exceeds ~90'+ extra time. */
const FALLBACK_MAX_DURATION_SEC = 90 * 60;

function resolveVideoDurationSec(
  explicit: number | undefined,
  events: { timeSec?: number | null }[]
): number {
  if (typeof explicit === "number" && explicit > 0) return explicit;
  let maxTime = 0;
  for (const ev of events) {
    if (typeof ev.timeSec === "number" && ev.timeSec > maxTime) {
      maxTime = ev.timeSec;
    }
  }
  if (maxTime > 0) {
    // 10% headroom so the last events are not on the boundary.
    return Math.ceil(maxTime * 1.1);
  }
  return FALLBACK_MAX_DURATION_SEC;
}

// Helper to convert old Event format to EventItem
interface OldEvent {
  id: number;
  type: string;
  team: string;
  playerId: number | null;
  player: { id: number; name: string } | null;
  x: number | null;
  y: number | null;
  minute: number | null;
  xg: number | null;
  metadata: string | null;
  videoUrl?: string | null;
  timeSec?: number | null;
}

export function Spotlight({
  events: rawEvents,
  matchId,
  videoUrl,
  homeTeamId,
  awayTeamId,
  formation = "4-4-2",
  initialMinute,
  videoDurationSec: videoDurationSecProp,
}: SpotlightProps) {
  type TeamSide = "home" | "away";
  type SpotlightLineupEntry = LineupEntry & { team: TeamSide };
  // Convert events to EventItem format and apply post-processing
  const events: EventItem[] = useMemo(() => {
    // Check if events are already in EventItem format
    if (rawEvents.length > 0 && typeof rawEvents[0].id === "string" && "label" in rawEvents[0]) {
      // If already in EventItem format, try to apply post-processing if we have metadata
      const eventItems = rawEvents as EventItem[];

      const videoDurationSec = resolveVideoDurationSec(videoDurationSecProp, eventItems);


      // Convert EventItem to RawEvent for post-processing
      const rawEventsForProcessing: RawEvent[] = eventItems.map((ev) => {
        // Try to extract confidence and extras from metadata if available
        let confidence = 0.7; // Default confidence
        let extras: RawEvent["extras"] = {};
        
        // If event has metadata, try to parse it
        // This assumes metadata might be in the event or passed separately
        // For now, use defaults - in production, extract from actual metadata
        
        return {
          timeSec: ev.timeSec,
          label: ev.type || ev.label.toLowerCase(),
          confidence,
          extras,
        };
      });
      
      // Apply post-processing
      const cleanedEvents = postprocessEvents(rawEventsForProcessing, videoDurationSec, {
        // Spotlight list should preserve most recognized events; keep only light dedupe.
        minConfidence: 0.2,
        topKPerWindow: Number.POSITIVE_INFINITY,
      });
      
      // Convert CleanEvent back to EventItem
      // Use a Map to track unique IDs and avoid duplicates
      const seenIds = new Set<string>();
      return cleanedEvents.map((cleaned, idx) => {
        // Find original event to preserve other fields
        const original = eventItems.find(e => Math.abs(e.timeSec - cleaned.timeSec) < 2) || eventItems[idx] || eventItems[0];
        
        // Create unique ID: combine original ID with timeSec and index to ensure uniqueness
        let uniqueId = `${original?.id || "cleaned"}-${Math.round(cleaned.timeSec)}-${idx}`;
        
        // If we've seen this ID before, add a suffix
        let suffix = 0;
        while (seenIds.has(uniqueId)) {
          suffix++;
          uniqueId = `${original?.id || "cleaned"}-${Math.round(cleaned.timeSec)}-${idx}-${suffix}`;
        }
        seenIds.add(uniqueId);
        
        return {
          id: uniqueId,
          label: `${cleaned.kind}${original?.label.includes(" - ") ? original.label.split(" - ").slice(1).join(" - ") : ""}`,
          timeSec: cleaned.timeSec,
          videoUrl: original?.videoUrl,
          playerId: original?.playerId,
          type: cleaned.kind.toLowerCase(),
          matchEventId: original?.matchEventId,
        };
      });
    }

    // Convert from old format
    const convertedEvents = (rawEvents as unknown as OldEvent[]).map((ev) => {
      // Priority: timeSec > metadata.timestamp > minute (but minute is match minutes, not video seconds)
      let timeSec = 0;
      
      if (ev.timeSec !== null && ev.timeSec !== undefined) {
        // timeSec is already in video seconds - use it directly
        timeSec = ev.timeSec;
      } else if (ev.metadata) {
        // Try to extract timestamp from metadata (video seconds from analysis)
        try {
          const metadata = typeof ev.metadata === "string" ? JSON.parse(ev.metadata) : ev.metadata;
          if (metadata && typeof metadata.timestamp === "number" && metadata.timestamp >= 0) {
            timeSec = metadata.timestamp; // timestamp is in video seconds
          }
        } catch (e) {
          // Invalid metadata, continue
        }
      }
      
      // If still no timeSec, don't use minute (it's match minutes, not video seconds)
      // minute * 60 would give wrong results (e.g., minute=140 → 8400 seconds for 11-min video)
      // Instead, use 0 or a small offset based on event order
      if (timeSec === 0 && ev.minute !== null) {
        // Use minute as a rough estimate, but cap it reasonably
        // Assume max 90 minutes match = max 90*60 = 5400 seconds
        // For an 11-minute video, we need to scale: if minute=140, that's invalid
        // Better: use minute as index and estimate ~10-15 seconds per event
        timeSec = Math.min(ev.minute * 10, 660); // Cap at 11 minutes (660 seconds)
      }

      const playerName = ev.player?.name || "";
      const teamLabel = ev.team === "home" ? "Home" : "Away";
      const typeLabel = ev.type.charAt(0).toUpperCase() + ev.type.slice(1);
      const label = playerName
        ? `${typeLabel} - ${playerName} (${teamLabel})`
        : `${typeLabel} (${teamLabel})`;

      // Use only real event/match video URL. If missing, VideoPlayer will show "No video for this event".
      const eventVideoUrl = ev.videoUrl || videoUrl || undefined;

      return {
        id: ev.id.toString(),
        label,
        timeSec,
        videoUrl: eventVideoUrl || undefined,
        playerId: ev.playerId?.toString() || undefined,
        type: ev.type, // Include type for categorization
        matchEventId: ev.id,
        _metadata: ev.metadata, // Temporary field for post-processing (not in EventItem type)
      };
    });
    
    // Apply post-processing to converted events.
    const videoDurationSec = resolveVideoDurationSec(videoDurationSecProp, convertedEvents);


    const rawEventsForProcessing: RawEvent[] = convertedEvents.map((ev: any) => {
      let confidence = 0.7; // Default confidence
      let extras: RawEvent["extras"] = {};
      
      // Parse metadata if available
      if (ev._metadata) {
        try {
          const metadata = typeof ev._metadata === "string" ? JSON.parse(ev._metadata) : ev._metadata;
          if (metadata && typeof metadata === "object") {
            confidence = metadata.confidence ?? confidence;
            extras = {
              ballSpeedKmh: metadata.ballSpeedKmh,
              goalDistanceM: metadata.goalDistanceM,
              ballInGoal: metadata.ballInGoal || metadata.outcome === "goal",
              shotScore: metadata.shotScore,
              passScore: metadata.passScore,
              goalScore: metadata.goalScore,
            };
          }
        } catch (e) {
          // Invalid metadata, use defaults
        }
      }
      
      return {
        timeSec: ev.timeSec,
        label: ev.type || "touch",
        confidence,
        extras,
      };
    });
    
    // Apply post-processing
    const cleanedEvents = postprocessEvents(rawEventsForProcessing, videoDurationSec, {
      // Spotlight list should preserve most recognized events; keep only light dedupe.
      minConfidence: 0.2,
      topKPerWindow: Number.POSITIVE_INFINITY,
    });
    
    // Convert CleanEvent back to EventItem, preserving original data
    // Use a Map to track unique IDs and avoid duplicates
    const seenIds = new Set<string>();
    return cleanedEvents.map((cleaned, idx) => {
      // Find original event by timeSec (within 2 seconds)
      const original = convertedEvents.find(e => Math.abs(e.timeSec - cleaned.timeSec) < 2) || convertedEvents[idx];
      
      if (!original) return null;
      
      // Create unique ID: combine original ID with timeSec and index to ensure uniqueness
      // This handles cases where post-processing creates multiple events from same original
      let uniqueId = `${original.id}-${Math.round(cleaned.timeSec)}-${idx}`;
      
      // If we've seen this ID before, add a suffix
      let suffix = 0;
      while (seenIds.has(uniqueId)) {
        suffix++;
        uniqueId = `${original.id}-${Math.round(cleaned.timeSec)}-${idx}-${suffix}`;
      }
      seenIds.add(uniqueId);
      
      // Update label with cleaned kind
      const playerName = original.label.includes(" - ") ? original.label.split(" - ")[1]?.split(" (")[0] : "";
      const teamLabel = original.label.includes("(Home)") ? "Home" : original.label.includes("(Away)") ? "Away" : "";
      const newLabel = playerName && teamLabel
        ? `${cleaned.kind} - ${playerName} (${teamLabel})`
        : `${cleaned.kind}${teamLabel ? ` (${teamLabel})` : ""}`;
      
      return {
        id: uniqueId,
        label: newLabel,
        timeSec: cleaned.timeSec,
        videoUrl: original.videoUrl,
        playerId: original.playerId,
        type: cleaned.kind.toLowerCase(),
        matchEventId: original.matchEventId,
      };
    }).filter((e) => e !== null) as EventItem[];
  }, [rawEvents, videoUrl, videoDurationSecProp]);

  const [selected, setSelected] = useState<EventItem | null>(events[0] ?? null);
  const [forcedStartSec, setForcedStartSec] = useState<number | null>(null);
  const [lineup, setLineup] = useState<SpotlightLineupEntry[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  const [savingClips, setSavingClips] = useState(false);

  // Keep selected event valid when event list changes.
  useEffect(() => {
    if (events.length === 0) {
      setSelected(null);
      setSelectedClipIds(new Set());
      return;
    }
    if (!selected || !events.some((e) => e.id === selected.id)) {
      setSelected(events[0]);
    }
    setSelectedClipIds((prev) => {
      const validIds = new Set(events.map((e) => e.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [events, selected]);

  useEffect(() => {
    async function loadPlaylists() {
      try {
        const res = await fetch("/api/playlists");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.playlists)) {
          const options: PlaylistOption[] = data.playlists.map((p: any) => ({ id: p.id, name: p.name }));
          setPlaylists(options);
          setSelectedPlaylistId((prev) => prev ?? (options[0]?.id ?? null));
        }
      } catch {
        // ignore
      }
    }
    void loadPlaylists();
  }, []);

  // Load lineup data
  useEffect(() => {
    if (initialMinute === undefined || initialMinute === null || events.length === 0) return;
    setForcedStartSec(Math.max(0, initialMinute * 60));
    // Prefer an event with available video near the target minute.
    const targetSec = Math.max(0, initialMinute * 60);
    const nearestWithVideo =
      [...events]
        .filter((e) => !!(e.videoUrl || videoUrl))
        .sort((a, b) => Math.abs(a.timeSec - targetSec) - Math.abs(b.timeSec - targetSec))[0] ||
      null;
    if (nearestWithVideo) {
      setSelected(nearestWithVideo);
    }
  }, [initialMinute, events, videoUrl]);

  useEffect(() => {
    const loadLineups = async () => {
      const entries: SpotlightLineupEntry[] = [];

      const loadTeamLineup = async (teamId: number | null | undefined, team: TeamSide) => {
        if (!teamId) return;

        try {
          const res = await fetch(`/api/matches/${matchId}/lineup?teamId=${teamId}`);
          const data = await parseApiResponseJson<{
            ok?: boolean;
            lineup?: Array<{
              playerId: number | null;
              x: number;
              y: number;
              player?: { id: number; name: string; number?: number | null };
              slot?: string;
            }>;
            formation?: string;
          }>(res);

          if (data.ok && data.lineup && data.formation) {
            const { formations } = await import("../lib/formations");
            const formationTemplate = formations[data.formation] || [];
            
            data.lineup.forEach((pos, index: number) => {
              if (!pos.playerId || !pos.player) return;

              // Try to get slot from position or use formation template
              const slot = pos.slot || formationTemplate[index]?.slot || `Slot${index}`;

              entries.push({
                playerId: pos.playerId.toString(),
                name: pos.player.name,
                number: pos.player.number || undefined,
                slot,
                team,
              });
            });
          }
        } catch (error) {
          console.warn(`[Spotlight] Failed to load lineup for team ${teamId}:`, error);
        }
      };

      await Promise.all([loadTeamLineup(homeTeamId, "home"), loadTeamLineup(awayTeamId, "away")]);
      setLineup(entries);
    };

    loadLineups();
  }, [matchId, homeTeamId, awayTeamId]);

  const selectedTeam = useMemo<TeamSide | null>(() => {
    if (!selected?.label) return null;
    if (selected.label.includes("(Home)")) return "home";
    if (selected.label.includes("(Away)")) return "away";
    return null;
  }, [selected?.label]);

  const lineupForPitch = useMemo(() => {
    const teamFiltered = selectedTeam ? lineup.filter((p) => p.team === selectedTeam) : lineup;
    return teamFiltered.map(({ team: _team, ...entry }) => entry);
  }, [lineup, selectedTeam]);

  const lineupMap = useMemo(() => buildLineupMap(formation, lineupForPitch), [formation, lineupForPitch]);
  const lineupCount = lineupForPitch.length;
  const hasCompleteLineup = lineupCount >= 7;

  const playbackSrc = selected?.videoUrl || videoUrl || undefined;

  const selectedClips = useMemo(
    () => events.filter((ev) => selectedClipIds.has(ev.id)),
    [events, selectedClipIds]
  );

  function toggleClipSelection(ev: EventItem) {
    setSelectedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(ev.id)) next.delete(ev.id);
      else next.add(ev.id);
      return next;
    });
  }

  function clipRangeForEvent(ev: EventItem): { startSec: number; endSec: number } {
    const t = Math.max(0, Math.floor(ev.timeSec));
    const type = (ev.type || "").toLowerCase();
    const lead = type === "goal" || type === "shot" ? 6 : 4;
    const tail = type === "goal" || type === "shot" ? 10 : 8;
    return { startSec: Math.max(0, t - lead), endSec: Math.max(1, t + tail) };
  }

  async function saveSelectedToPlaylist() {
    if (!selectedPlaylistId) {
      toast.error("Select a playlist first.");
      return;
    }
    if (selectedClips.length === 0) {
      toast.error("Select at least one clip from Spotlight events.");
      return;
    }
    setSavingClips(true);
    try {
      let successCount = 0;
      for (const ev of selectedClips) {
        const { startSec, endSec } = clipRangeForEvent(ev);
        const res = await fetch(`/api/playlists/${selectedPlaylistId}/clips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            title: ev.label,
            startSec,
            endSec,
            matchEventId: ev.matchEventId,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          successCount += 1;
        }
      }
      if (successCount > 0) {
        toast.success(`Saved ${successCount} clip${successCount === 1 ? "" : "s"} to playlist.`);
        setSelectedClipIds(new Set());
      } else {
        toast.error("No clips were saved.");
      }
    } catch {
      toast.error("Failed to save clips.");
    } finally {
      setSavingClips(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Spotlight</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-slate-400">
            {events.length} {events.length === 1 ? "event" : "events"}
          </div>
          <select
            value={selectedPlaylistId ?? ""}
            onChange={(e) => setSelectedPlaylistId(e.target.value ? Number(e.target.value) : null)}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="">Select playlist</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveSelectedToPlaylist}
            disabled={savingClips || selectedClips.length === 0}
            className="h-8 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingClips
              ? "Saving..."
              : `Save selected (${selectedClips.length})`}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video & Pitch Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <VideoPlayer
              src={playbackSrc}
              startTime={forcedStartSec ?? selected?.timeSec ?? 0}
              autoPlay={false}
            />
          </div>

          {/* Pitch Overlay */}
          {Object.keys(lineupMap).length > 0 && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Formation</h3>
              {hasCompleteLineup ? (
                <Pitch lineupMap={lineupMap} selectedPlayerId={selected?.playerId} />
              ) : (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Incomplete lineup data ({lineupCount} players). Add full lineup to render proper formation.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-lg h-full flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Events</h3>
            <div className="flex-1 min-h-0">
              <EventList
                events={events}
                selectedId={selected?.id}
                selectedClipIds={selectedClipIds}
                onToggleClipSelection={toggleClipSelection}
                onSelect={(ev) => {
                  setForcedStartSec(null);
                  setSelected(ev);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
