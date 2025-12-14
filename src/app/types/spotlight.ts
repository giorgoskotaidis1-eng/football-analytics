export type EventItem = {
  id: string;
  label: string;
  timeSec: number;        // seconds
  videoUrl?: string;      // πλήρες URL ή /api/... που δίνει mp4/HLS
  playerId?: string;
  type?: string;          // Event type: "shot", "pass", "tackle", etc.
};

export type LineupEntry = {
  playerId: string;
  name: string;
  number?: number;
  slot: string; // π.χ. "RCB", "LW" κ.λπ.
};

export type PlayerInfo = {
  name: string;
  number?: number;
  coords: { x: number; y: number };
  slot: string;
};

