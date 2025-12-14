import { formations } from "./formations";
import { LineupEntry, PlayerInfo } from "../types/spotlight";

export function buildLineupMap(
  formationKey: string,
  lineupEntries: LineupEntry[]
): Record<string, PlayerInfo> {
  const template = formations[formationKey];
  if (!template) return {};

  const slotCoords = Object.fromEntries(template.map((s) => [s.slot, { x: s.x, y: s.y }]));

  const map: Record<string, PlayerInfo> = {};

  for (const e of lineupEntries) {
    const c = slotCoords[e.slot];
    if (!c) continue;

    map[e.playerId] = {
      name: e.name,
      number: e.number,
      coords: c,
      slot: e.slot,
    };
  }

  return map;
}

