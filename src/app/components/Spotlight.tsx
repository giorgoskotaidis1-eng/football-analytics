"use client";

import React, { useMemo, useState, useEffect } from "react";
import { EventItem, LineupEntry } from "../types/spotlight";
import { buildLineupMap } from "../lib/buildLineupMap";
import { VideoPlayer } from "./VideoPlayer";
import { EventList } from "./EventList";
import { Pitch } from "./Pitch";
import { postprocessEvents, RawEvent } from "@/services/events/postprocessEvents";

interface SpotlightProps {
  events: EventItem[];
  matchId: number;
  videoUrl?: string | null; // Main match video URL (for fallback)
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  formation?: string;
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
}: SpotlightProps) {
  // Convert events to EventItem format and apply post-processing
  const events: EventItem[] = useMemo(() => {
    // Check if events are already in EventItem format
    if (rawEvents.length > 0 && typeof rawEvents[0].id === "string" && "label" in rawEvents[0]) {
      // If already in EventItem format, try to apply post-processing if we have metadata
      const eventItems = rawEvents as EventItem[];
      
      // Try to extract video duration from first event or use default
      // In a real scenario, you'd get this from the video metadata
      const videoDurationSec = 660; // Default 11 minutes, should be passed as prop or extracted
      
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
      const cleanedEvents = postprocessEvents(rawEventsForProcessing, videoDurationSec);
      
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

      // For testing: use demo video if no videoUrl is provided
      // TODO: Remove this after testing - use a known working MP4 URL
      const eventVideoUrl = ev.videoUrl || videoUrl || (typeof window !== "undefined" && window.location.hostname === "localhost" 
        ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
        : undefined);

      return {
        id: ev.id.toString(),
        label,
        timeSec,
        videoUrl: eventVideoUrl || undefined,
        playerId: ev.playerId?.toString() || undefined,
        type: ev.type, // Include type for categorization
        _metadata: ev.metadata, // Temporary field for post-processing (not in EventItem type)
      };
    });
    
    // Apply post-processing to converted events
    // Extract metadata for confidence and extras
    // TODO: Extract videoDurationSec from video metadata or pass as prop
    const videoDurationSec = 660; // Default 11 minutes, should be extracted from video or passed as prop
    
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
              isPressure: metadata.isPressure,
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
    const cleanedEvents = postprocessEvents(rawEventsForProcessing, videoDurationSec);
    
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
      };
    }).filter((e): e is EventItem => e !== null);
  }, [rawEvents, videoUrl]);

  const [selected, setSelected] = useState<EventItem | null>(events[0] ?? null);
  const [lineup, setLineup] = useState<LineupEntry[]>([]);

  // Load lineup data
  useEffect(() => {
    const loadLineups = async () => {
      const entries: LineupEntry[] = [];

      const loadTeamLineup = async (teamId: number | null | undefined) => {
        if (!teamId) return;

        try {
          const res = await fetch(`/api/matches/${matchId}/lineup?teamId=${teamId}`);
          const data = await res.json();

          if (data.ok && data.lineup && data.formation) {
            const { formations } = await import("../lib/formations");
            const formationTemplate = formations[data.formation] || [];
            
            data.lineup.forEach((pos: {
              playerId: number | null;
              x: number;
              y: number;
              player?: { id: number; name: string; number?: number | null };
              slot?: string;
            }, index: number) => {
              if (!pos.playerId || !pos.player) return;

              // Try to get slot from position or use formation template
              const slot = pos.slot || formationTemplate[index]?.slot || `Slot${index}`;

              entries.push({
                playerId: pos.playerId.toString(),
                name: pos.player.name,
                number: pos.player.number || undefined,
                slot,
              });
            });
          }
        } catch (error) {
          console.warn(`[Spotlight] Failed to load lineup for team ${teamId}:`, error);
        }
      };

      await Promise.all([loadTeamLineup(homeTeamId), loadTeamLineup(awayTeamId)]);
      setLineup(entries);
    };

    loadLineups();
  }, [matchId, homeTeamId, awayTeamId]);

  const lineupMap = useMemo(() => buildLineupMap(formation, lineup), [formation, lineup]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Spotlight</h2>
        <div className="text-sm text-slate-400">
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video & Pitch Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <VideoPlayer src={selected?.videoUrl} startTime={selected?.timeSec ?? 0} autoPlay={false} />
          </div>

          {/* Pitch Overlay */}
          {Object.keys(lineupMap).length > 0 && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Formation</h3>
              <Pitch lineupMap={lineupMap} selectedPlayerId={selected?.playerId} />
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-lg h-full flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Events</h3>
            <div className="flex-1 min-h-0">
              <EventList events={events} selectedId={selected?.id} onSelect={setSelected} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
