"use client";

import React, { useMemo, useState } from "react";
import { EventItem } from "../types/spotlight";

// Event type icons and categories
const EVENT_CATEGORIES = {
  goals: {
    label: "Goals",
    icon: "🥅",
    types: ["goal"],
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  shots: {
    label: "Shots",
    icon: "🎯",
    types: ["shot"],
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  passes: {
    label: "Passes",
    icon: "⚽",
    types: ["pass"],
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  touches: {
    label: "Touches",
    icon: "👆",
    types: ["touch"],
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  defensive: {
    label: "Defensive",
    icon: "🛡️",
    types: ["tackle", "interception", "clearance", "block"],
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  setPieces: {
    label: "Set Pieces",
    icon: "🚩",
    types: ["corner", "free_kick"],
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  fouls: {
    label: "Fouls",
    icon: "⚠️",
    types: ["foul"],
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  all: {
    label: "All Events",
    icon: "📋",
    types: [],
    color: "text-slate-300",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
  },
};

// Get event type from label or event item
function getEventType(ev: EventItem): string {
  // First try to use the type field if available
  if (ev.type) return ev.type.toLowerCase();
  
  // Fallback to parsing label
  const lower = ev.label.toLowerCase();
  if (lower.includes("shot")) return "shot";
  if (lower.includes("pass")) return "pass";
  if (lower.includes("touch")) return "touch";
  if (lower.includes("tackle")) return "tackle";
  if (lower.includes("interception")) return "interception";
  if (lower.includes("clearance")) return "clearance";
  if (lower.includes("block")) return "block";
  if (lower.includes("goal")) return "goal";
  if (lower.includes("corner")) return "corner";
  if (lower.includes("free kick") || lower.includes("free_kick")) return "free_kick";
  if (lower.includes("foul")) return "foul";
  return "unknown";
}

// Get category for event type
function getCategoryForType(type: string): keyof typeof EVENT_CATEGORIES {
  for (const [key, cat] of Object.entries(EVENT_CATEGORIES)) {
    if (cat.types.includes(type)) {
      return key as keyof typeof EVENT_CATEGORIES;
    }
  }
  return "all";
}

// Get icon for event type
function getEventIcon(type: string): string {
  const category = getCategoryForType(type);
  return EVENT_CATEGORIES[category].icon;
}

export function EventList({
  events,
  selectedId,
  onSelect,
  selectedClipIds,
  onToggleClipSelection,
}: {
  events: EventItem[];
  selectedId?: string;
  onSelect: (ev: EventItem) => void;
  selectedClipIds?: Set<string>;
  onToggleClipSelection?: (ev: EventItem) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EVENT_CATEGORIES>("all");

  // Group events by category
  const eventsByCategory = useMemo(() => {
    const grouped: Record<string, EventItem[]> = {};
    
    // Initialize all categories
    Object.keys(EVENT_CATEGORIES).forEach((key) => {
      grouped[key] = [];
    });

    events.forEach((ev) => {
      const type = getEventType(ev);
      const category = getCategoryForType(type);
      if (category !== "all") {
        grouped[category].push(ev);
      }
      grouped.all.push(ev);
    });

    return grouped;
  }, [events]);

  // Get filtered events based on active category
  const filteredEvents = eventsByCategory[activeCategory] || [];

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm">Δεν υπάρχουν διαθέσιμα events</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-slate-700/50">
        {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => {
          const count = eventsByCategory[key]?.length || 0;
          const isActive = activeCategory === key;
          
          if (count === 0 && key !== "all") return null;

          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key as keyof typeof EVENT_CATEGORIES)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                flex items-center gap-1.5
                ${isActive
                  ? `${cat.bgColor} ${cat.borderColor} border text-white`
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300"
                }
              `}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded text-[10px] font-semibold
                  ${isActive ? "bg-white/20" : "bg-slate-700/50"}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto subtle-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">Δεν υπάρχουν events σε αυτή την κατηγορία</p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isSelected = ev.id === selectedId;
            const isClipSelected = selectedClipIds?.has(ev.id) ?? false;
            const eventType = getEventType(ev);
            const icon = getEventIcon(eventType);
            const category = getCategoryForType(eventType);
            const catStyle = EVENT_CATEGORIES[category];

            return (
              <div
                key={ev.id}
                onClick={() => onSelect(ev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(ev);
                  }
                }}
                className={`
                  relative px-4 py-3 text-left rounded-lg transition-all duration-200
                  border min-h-[44px] flex items-center gap-3
                  ${isSelected
                    ? `${catStyle.bgColor} ${catStyle.borderColor} border-2 shadow-lg text-white`
                    : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 hover:border-slate-600/50"
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  text-2xl flex-shrink-0
                  ${isSelected ? "scale-110" : ""}
                  transition-transform duration-200
                `}>
                  {icon}
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isSelected ? catStyle.color : "text-slate-200"}`}>
                    {ev.label}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{formatTime(ev.timeSec)}</span>
                    {!ev.videoUrl && (
                      <span className="text-xs text-amber-500/70">(no video)</span>
                    )}
                  </div>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className={`ml-2 w-2 h-2 rounded-full ${catStyle.color.replace("text-", "bg-")} animate-pulse flex-shrink-0`}></div>
                )}
                {onToggleClipSelection && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleClipSelection(ev);
                    }}
                    className={`ml-2 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                      isClipSelected
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-600 bg-slate-800/60 text-slate-300 hover:bg-slate-700/70"
                    }`}
                  >
                    {isClipSelected ? "Selected" : "Add"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
