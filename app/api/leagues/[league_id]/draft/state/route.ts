import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  draftStateHistory,
  draftedPlayers,
  keepers,
  leagues,
} from "@/app/schema";
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
    const leagueId = (await params).league_id;

    switch (action) {
      case "saveSnapshot":
        await db.insert(draftStateHistory).values({
          leagueId,
          draftState: data.draftState,
          eventType: data.eventType,
          eventData: data.eventData,
        });

        // Update league isDraftStarted flag based on event type
        if (data.eventType === "draftStarted") {
          await db
            .update(leagues)
            .set({ isDraftStarted: 1 })
            .where(eq(leagues.id, leagueId));
        } else if (data.eventType === "draftReset") {
          await db
            .update(leagues)
            .set({ isDraftStarted: 0 })
            .where(eq(leagues.id, leagueId));
        }
        break;

      case "addDraftedPlayer":
        console.log("API: Adding drafted player to database", {
          teamId: data.teamId,
          playerId: data.playerId,
          leagueId,
          draftPrice: data.draftPrice,
        });

        try {
          // Check if player is already drafted in this league
          const existingDraft = await db
            .select()
            .from(draftedPlayers)
            .where(
              and(
                eq(draftedPlayers.leagueId, leagueId),
                eq(draftedPlayers.playerId, data.playerId)
              )
            )
            .limit(1);

          if (existingDraft.length > 0) {
            console.log(
              "API: Player already drafted, skipping duplicate insert",
              {
                playerId: data.playerId,
                existingDraft: existingDraft[0],
              }
            );
            return NextResponse.json({
              success: true,
              message: "Player already drafted",
            });
          }

          await db.insert(draftedPlayers).values({
            teamId: data.teamId,
            playerId: data.playerId,
            leagueId,
            draftPrice: data.draftPrice,
          });
          console.log("API: Successfully added drafted player to database");
        } catch (error) {
          console.error("API: Error inserting drafted player:", error);
          throw error;
        }
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

      case "clearDraftStateHistory":
        // Clear all draft state history for this league
        await db
          .delete(draftStateHistory)
          .where(eq(draftStateHistory.leagueId, leagueId));
        break;

      case "convertKeepersToDrafted":
        // Convert keepers to drafted players
        if (data.keepers && Array.isArray(data.keepers)) {
          for (const keeper of data.keepers) {
            // Check if player is already drafted
            const existingDraft = await db
              .select()
              .from(draftedPlayers)
              .where(
                and(
                  eq(draftedPlayers.leagueId, leagueId),
                  eq(draftedPlayers.playerId, keeper.playerId)
                )
              )
              .limit(1);

            if (existingDraft.length === 0) {
              // Add keeper as drafted player
              await db.insert(draftedPlayers).values({
                leagueId,
                teamId: keeper.teamId,
                playerId: keeper.playerId,
                draftPrice: keeper.keeperPrice || 0,
              });
            }
          }
        }
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

    const leagueId = await params.league_id;

    // Get the latest draft state (including reset states)
    const latest = await db.query.draftStateHistory.findFirst({
      where: (row, { eq, isNotNull }) =>
        eq(row.leagueId, leagueId) && isNotNull(row.draftState),
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
