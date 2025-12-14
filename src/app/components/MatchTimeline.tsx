"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";

type MatchEvent = {
  id: number;
  type: string;
  team: string;
  minute: number | null;
  x: number | null;
  y: number | null;
  xg: number | null;
  player: { id: number; name: string } | null;
  metadata: string | null;
};

interface MatchTimelineProps {
  events: MatchEvent[];
  matchDuration?: number; // Total match duration in minutes (default: 90)
  onEventClick?: (event: MatchEvent) => void;
  currentTime?: number; // Current playback time in minutes (for video sync)
  onTimeChange?: (time: number) => void; // Callback when user clicks on timeline
}

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  goal: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", icon: "⚽" },
  shot: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", icon: "🎯" },
  pass: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", icon: "➡️" },
  assist: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400", icon: "🎯" },
  tackle: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", icon: "🛡️" },
  touch: { bg: "bg-slate-500/20", border: "border-slate-500/50", text: "text-slate-400", icon: "👆" },
  interception: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400", icon: "✋" },
  default: { bg: "bg-slate-500/20", border: "border-slate-500/50", text: "text-slate-400", icon: "•" },
};

const EVENT_LABELS: Record<string, string> = {
  goal: "Goal",
  shot: "Shot",
  pass: "Pass",
  assist: "Assist",
  tackle: "Tackle",
  touch: "Touch",
  interception: "Interception",
};

export function MatchTimeline({
  events,
  matchDuration = 90,
  onEventClick,
  currentTime = 0,
  onTimeChange,
}: MatchTimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<MatchEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sort events by minute
  const sortedEvents = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  // Calculate position on timeline (0-100%)
  const getEventPosition = (minute: number | null): number => {
    if (minute === null) return 0;
    return Math.min(100, (minute / matchDuration) * 100);
  };

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !onTimeChange) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const clickedTime = (percentage / 100) * matchDuration;
    onTimeChange(clickedTime);
  };

  // Get event color scheme
  const getEventColor = (eventType: string) => {
    return EVENT_COLORS[eventType] || EVENT_COLORS.default;
  };

  // Group events by minute to avoid overlap
  const eventsByMinute = new Map<number, MatchEvent[]>();
  sortedEvents.forEach((event) => {
    const minute = event.minute || 0;
    if (!eventsByMinute.has(minute)) {
      eventsByMinute.set(minute, []);
    }
    eventsByMinute.get(minute)!.push(event);
  });

  return (
    <div className="w-full space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Match Timeline</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {sortedEvents.length} event{sortedEvents.length !== 1 ? "s" : ""} • Click events to view details
          </p>
        </div>
        {currentTime > 0 && (
          <div className="text-[11px] text-slate-400">
            {Math.floor(currentTime)}:{String(Math.floor((currentTime % 1) * 60)).padStart(2, "0")} / {matchDuration}:00
          </div>
        )}
      </div>

      {/* Timeline Bar */}
      <div
        ref={timelineRef}
        className="relative h-16 w-full cursor-pointer rounded-lg border border-slate-800 bg-slate-900/50 p-2"
        onClick={handleTimelineClick}
      >
        {/* Timeline Background with Minute Markers */}
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: Math.floor(matchDuration / 5) + 1 }, (_, i) => i * 5).map((minute) => (
            <div
              key={minute}
              className="absolute h-full border-l border-slate-700/50"
              style={{ left: `${(minute / matchDuration) * 100}%` }}
            >
              <span className="absolute -bottom-5 left-0 text-[9px] text-slate-600">{minute}'</span>
            </div>
          ))}
        </div>

        {/* Current Time Indicator */}
        {currentTime > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-emerald-500 z-20"
            style={{ left: `${getEventPosition(currentTime)}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
        )}

        {/* Event Markers */}
        {sortedEvents.map((event, idx) => {
          const position = getEventPosition(event.minute);
          const colors = getEventColor(event.type);
          const isHovered = hoveredEvent?.id === event.id;
          const isSelected = selectedEvent?.id === event.id;
          const minuteEvents = eventsByMinute.get(event.minute || 0) || [];
          const eventIndexInMinute = minuteEvents.findIndex((e) => e.id === event.id);
          const offsetY = eventIndexInMinute * 8; // Stack events at same minute

          return (
            <div
              key={event.id}
              className={`absolute z-10 transition-all ${
                isHovered || isSelected ? "scale-125" : "scale-100"
              }`}
              style={{
                left: `${position}%`,
                top: `${20 + offsetY}%`,
                transform: `translateX(-50%) ${isHovered || isSelected ? "scale(1.25)" : ""}`,
              }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(event);
                onEventClick?.(event);
              }}
            >
              {/* Event Marker Circle */}
              <div
                className={`h-4 w-4 rounded-full border-2 cursor-pointer transition-all ${
                  colors.border
                } ${colors.bg} ${isHovered || isSelected ? "ring-2 ring-offset-2 ring-offset-slate-950 ring-emerald-500" : ""}`}
                title={`${EVENT_LABELS[event.type] || event.type} - ${event.minute}'`}
              >
                <div className="flex h-full w-full items-center justify-center text-[8px]">
                  {colors.icon}
                </div>
              </div>

              {/* Event Tooltip on Hover */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30">
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 shadow-xl min-w-[180px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${colors.text}`}>
                        {EVENT_LABELS[event.type] || event.type}
                      </span>
                      <span className="text-slate-500">{event.minute}'</span>
                    </div>
                    {event.player && (
                      <div className="text-[10px] text-slate-400">
                        {event.player.name}
                      </div>
                    )}
                    {event.xg !== null && event.xg > 0 && (
                      <div className="text-[10px] text-emerald-400 mt-1">
                        xG: {event.xg.toFixed(2)}
                      </div>
                    )}
                    {event.team && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        {event.team === "home" ? "Home" : "Away"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event List Below Timeline */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-[11px]">
            Δεν έχουν καταγραφεί events ακόμα. Προσθέστε events για να τα δείτε στο timeline.
          </div>
        ) : (
          sortedEvents.map((event) => {
            const colors = getEventColor(event.type);
            const isSelected = selectedEvent?.id === event.id;

            return (
              <div
                key={event.id}
                className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? `${colors.border} ${colors.bg} border-2`
                    : "border-slate-800 bg-slate-900/30 hover:bg-slate-900/50"
                }`}
                onClick={() => {
                  setSelectedEvent(event);
                  onEventClick?.(event);
                  if (onTimeChange && event.minute !== null) {
                    onTimeChange(event.minute);
                  }
                }}
              >
                {/* Event Icon */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.bg} ${colors.border} border`}>
                  <span className="text-sm">{colors.icon}</span>
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${colors.text}`}>
                        {EVENT_LABELS[event.type] || event.type}
                      </span>
                      {event.xg !== null && event.xg > 0 && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          xG: {event.xg.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {event.minute !== null ? `${event.minute}'` : "N/A"}
                    </span>
                  </div>
                  {event.player && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {event.player.name} • {event.team === "home" ? "Home" : "Away"}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


