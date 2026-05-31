import { cookies } from "next/headers";
import { verifySession } from "./auth";
import { prisma } from "./prisma";

export async function getPlayerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    
    const session = await verifySession(token);
    if (!session) return null;
    
    // Check if it's a player session (role === "Player")
    if (session.role !== "Player") return null;
    
    return session;
  } catch (error) {
    console.error("[player-auth.getPlayerSession] Error:", error);
    return null;
  }
}

export async function getCurrentPlayer() {
  try {
    const session = await getPlayerSession();
    if (!session) return null;

    const player = await prisma.player.findUnique({
      where: { id: session.userId },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    return player;
  } catch (error) {
    console.error("[player-auth.getCurrentPlayer] Error:", error);
    return null;
  }
}






