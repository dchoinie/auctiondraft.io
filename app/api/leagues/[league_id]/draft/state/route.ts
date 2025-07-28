import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { draftStateHistory, draftedPlayers, keepers } from "@/app/schema";
import { eq, notInArray, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, data } = await request.json();
    const leagueId = params.league_id;

    switch (action) {
      case "saveSnapshot":
        await db.insert(draftStateHistory).values({
          leagueId,
          draftState: data.draftState,
          eventType: data.eventType,
          eventData: data.eventData,
        });
        break;

      case "addDraftedPlayer":
        await db.insert(draftedPlayers).values({
          teamId: data.teamId,
          playerId: data.playerId,
          leagueId,
          draftPrice: data.draftPrice,
        });
        break;

      case "clearDraftedPlayers":
        // Get all keeper player IDs for this league to exclude them from deletion
        const keeperPlayers = await db
          .select({ playerId: keepers.playerId })
          .from(keepers)
          .where(eq(keepers.leagueId, leagueId));

        const keeperPlayerIds = keeperPlayers
          .map((k) => k.playerId)
          .filter((id): id is string => id !== null);

        if (keeperPlayerIds.length > 0) {
          // Delete drafted players but exclude keeper players
          await db
            .delete(draftedPlayers)
            .where(
              and(
                eq(draftedPlayers.leagueId, leagueId),
                notInArray(draftedPlayers.playerId, keeperPlayerIds)
              )
            );
        } else {
          // If no keepers, delete all drafted players for this league
          await db
            .delete(draftedPlayers)
            .where(eq(draftedPlayers.leagueId, leagueId));
        }
        break;

      case "clearKeepers":
        await db.delete(keepers).where(eq(keepers.leagueId, leagueId));
        break;

      case "clearDraftData":
        // Clear both drafted players and keepers
        await Promise.all([
          db
            .delete(draftedPlayers)
            .where(eq(draftedPlayers.leagueId, leagueId)),
          db.delete(keepers).where(eq(keepers.leagueId, leagueId)),
        ]);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in draft state API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leagueId = params.league_id;

    // Get the latest draft state
    const latest = await db.query.draftStateHistory.findFirst({
      where: (row, { eq }) => eq(row.leagueId, leagueId),
      orderBy: (row, { desc }) => desc(row.createdAt),
    });

    return NextResponse.json({ draftState: latest?.draftState || null });
  } catch (error) {
    console.error("Error getting draft state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
