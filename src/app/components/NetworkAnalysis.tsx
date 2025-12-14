"use client";

import { PassNetwork } from "./analytics/PassNetwork";

interface Player {
  id: number;
  name: string;
  number?: number | null;
  position?: string;
}

interface Event {
  id: number;
  type: string;
  team: string;
  playerId: number | null;
  player: { id: number; name: string } | null;
  x: number | null;
  y: number | null;
  minute: number | null;
  metadata: string | null;
}

interface NetworkAnalysisProps {
  events: Event[];
  players: Player[];
  team: "home" | "away";
  teamName: string;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeamName?: string;
  awayTeamName?: string;
}

export function NetworkAnalysis({ 
  events, 
  players, 
  team, 
  teamName,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: NetworkAnalysisProps) {
  // Use the new PassNetwork component with all features
  return (
    <PassNetwork
      events={events}
      players={players}
      homeTeamId={homeTeamId || null}
      awayTeamId={awayTeamId || null}
      homeTeamName={homeTeamName || teamName}
      awayTeamName={awayTeamName || teamName}
    />
  );
}
