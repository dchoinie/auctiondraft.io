import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { draftedPlayers, offlineTeams, leagues, nflPlayers } from "@/app/schema";
import { eq, and } from "drizzle-orm";
import { calculateRosterInfo } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string; team_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { league_id: leagueId, team_id: teamId } = resolvedParams;

    // Verify league exists and user is owner
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to view roster" },
        { status: 403 }
      );
    }

    // Verify offline team exists
    const offlineTeam = await db
      .select()
      .from(offlineTeams)
      .where(and(eq(offlineTeams.id, teamId), eq(offlineTeams.leagueId, leagueId)))
      .limit(1);

    if (offlineTeam.length === 0) {
      return NextResponse.json(
        { success: false, error: "Offline team not found" },
        { status: 404 }
      );
    }

    // Get drafted players for this team
    const draftedPlayersList = await db
      .select({
        id: draftedPlayers.id,
        playerId: draftedPlayers.playerId,
        draftPrice: draftedPlayers.draftPrice,
        createdAt: draftedPlayers.createdAt,
        // Player details
        firstName: nflPlayers.firstName,
        lastName: nflPlayers.lastName,
        position: nflPlayers.position,
        team: nflPlayers.team,
        fantasyPositions: nflPlayers.fantasyPositions,
        status: nflPlayers.status,
        injuryStatus: nflPlayers.injuryStatus,
      })
      .from(draftedPlayers)
      .innerJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .where(
        and(
          eq(draftedPlayers.teamId, teamId),
          eq(draftedPlayers.leagueId, leagueId),
          eq(draftedPlayers.teamType, "offline")
        )
      );

    // Calculate roster information
    const rosterInfo = calculateRosterInfo({
      qbSlots: league[0].qbSlots,
      rbSlots: league[0].rbSlots,
      wrSlots: league[0].wrSlots,
      teSlots: league[0].teSlots,
      flexSlots: league[0].flexSlots,
      dstSlots: league[0].dstSlots,
      kSlots: league[0].kSlots,
      benchSlots: league[0].benchSlots,
    });

    // Calculate remaining budget
    const totalSpent = draftedPlayersList.reduce((sum, player) => sum + player.draftPrice, 0);
    const remainingBudget = offlineTeam[0].budget - totalSpent;

    // Calculate roster spots filled by position
    const positionCounts = {
      QB: 0,
      RB: 0,
      WR: 0,
      TE: 0,
      DST: 0,
      K: 0,
    };

    draftedPlayersList.forEach((player) => {
      if (player.position in positionCounts) {
        positionCounts[player.position as keyof typeof positionCounts]++;
      }
    });

    const rosterSpotsFilled = Object.values(positionCounts).reduce((sum, count) => sum + count, 0);
    const remainingRosterSpots = rosterInfo.totalRosterSize - rosterSpotsFilled;

    return NextResponse.json({
      success: true,
      roster: {
        team: {
          id: offlineTeam[0].id,
          name: offlineTeam[0].name,
          budget: offlineTeam[0].budget,
          remainingBudget,
          draftOrder: offlineTeam[0].draftOrder,
        },
        rosterInfo,
        draftedPlayers: draftedPlayersList.map((player) => ({
          id: player.id,
          playerId: player.playerId,
          draftPrice: player.draftPrice,
          createdAt: player.createdAt.toISOString(),
          player: {
            firstName: player.firstName,
            lastName: player.lastName,
            position: player.position,
            team: player.team,
            fantasyPositions: player.fantasyPositions,
            status: player.status,
            injuryStatus: player.injuryStatus,
          },
        })),
        positionCounts,
        rosterSpotsFilled,
        remainingRosterSpots,
      },
    });
  } catch (error) {
    console.error("Error fetching offline team roster:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch roster" },
      { status: 500 }
    );
  }
} 