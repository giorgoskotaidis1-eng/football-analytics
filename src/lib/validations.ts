import { z } from "zod";

// Match validation schema
export const matchSchema = z.object({
  homeTeamId: z.string().optional(),  // Optional - can use homeTeamName instead
  awayTeamId: z.string().optional(),  // Optional - can use awayTeamName instead
  homeTeamName: z.string().optional(),  // Opponent name if team not registered
  awayTeamName: z.string().optional(),  // Opponent name if team not registered
  competition: z.string().min(1, "Competition is required"),
  venue: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  scoreHome: z.string().optional(),
  scoreAway: z.string().optional(),
  shotsHome: z.string().optional(),
  shotsAway: z.string().optional(),
}).refine((data) => {
  // At least one team must be specified (either ID or name)
  const hasHomeTeam = !!(data.homeTeamId || data.homeTeamName);
  const hasAwayTeam = !!(data.awayTeamId || data.awayTeamName);
  return hasHomeTeam && hasAwayTeam;
}, {
  message: "Both home and away teams must be specified (either as registered team or opponent name)",
  path: ["awayTeamId"],
}).refine((data) => {
  // If both teams are registered, they must be different
  if (data.homeTeamId && data.awayTeamId) {
    return data.homeTeamId !== data.awayTeamId;
  }
  return true;
}, {
  message: "Home team and away team must be different",
  path: ["awayTeamId"],
});

// Player validation schema
export const playerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  position: z.string().min(1, "Position is required"),
  age: z.string().optional(),
  club: z.string().optional(),
  nationality: z.string().optional(),
  foot: z.enum(["Left", "Right", "Both"]).optional(),
  teamId: z.string().optional(),
  number: z.string().optional(),
});

// Team validation schema
export const teamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
  league: z.string().optional(),
  style: z.string().optional(),
});

// Match event validation schema
export const matchEventSchema = z.object({
  type: z.enum(["shot", "pass", "touch", "tackle", "foul", "corner", "free_kick"]),
  team: z.enum(["home", "away"]),
  playerId: z.string().optional(),
  x: z.string().optional(),
  y: z.string().optional(),
  minute: z.string().optional(),
  outcome: z.string().optional(),
  metadata: z.string().optional(),
});

export type MatchFormData = z.infer<typeof matchSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;
export type TeamFormData = z.infer<typeof teamSchema>;
export type MatchEventFormData = z.infer<typeof matchEventSchema>;

