import { prisma } from "@/lib/prisma";

export async function getUserTeamIds(userId: number): Promise<number[]> {
  const [userTeams, createdTeams] = await Promise.all([
    prisma.userTeam.findMany({
      where: { userId, status: "active" },
      select: { teamId: true },
    }),
    prisma.team.findMany({
      where: { createdById: userId },
      select: { id: true },
    }),
  ]);

  const teamIds = [...userTeams.map((ut) => ut.teamId), ...createdTeams.map((t) => t.id)];
  return Array.from(new Set(teamIds));
}
