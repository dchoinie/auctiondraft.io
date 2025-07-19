import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  teams,
  draftState,
  draftNominations,
  nflPlayers,
  rosters,
  draftBids,
  leagues,
} from "@/app/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { league_id: string } }
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

    const leagueId = resolvedParams.league_id;
    const body = await req.json();
    const { playerId, nominationAmount } = body;

    if (!playerId || !nominationAmount || nominationAmount < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid nomination data" },
        { status: 400 }
      );
    }

    // Verify user is part of the league
    const userTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, userId)))
      .limit(1);

    if (userTeam.length === 0) {
      return NextResponse.json(
        { success: false, error: "Not authorized to nominate in this draft" },
        { status: 403 }
      );
    }

    // Get current draft state
    const currentDraftState = await db
      .select()
      .from(draftState)
      .where(eq(draftState.leagueId, leagueId))
      .limit(1);

    if (currentDraftState.length === 0) {
      return NextResponse.json(
        { success: false, error: "Draft not started" },
        { status: 400 }
      );
    }

    const draftStateData = currentDraftState[0];

    // Check if it's this team's turn
    if (draftStateData.currentTurnTeamId !== userTeam[0].id) {
      return NextResponse.json(
        { success: false, error: "Not your turn to nominate" },
        { status: 400 }
      );
    }

    // Check if draft is in nominating phase
    if (draftStateData.phase !== "nominating") {
      return NextResponse.json(
        { success: false, error: "Not in nominating phase" },
        { status: 400 }
      );
    }

    // Check if there's already an active nomination
    if (draftStateData.currentNominationId) {
      return NextResponse.json(
        { success: false, error: "Another nomination is already in progress" },
        { status: 400 }
      );
    }

    // Verify player exists and is available
    const player = await db
      .select()
      .from(nflPlayers)
      .where(eq(nflPlayers.id, playerId))
      .limit(1);

    if (player.length === 0) {
      return NextResponse.json(
        { success: false, error: "Player not found" },
        { status: 404 }
      );
    }

    // Check if player is already on a roster in this league
    const existingRoster = await db
      .select()
      .from(rosters)
      .leftJoin(teams, eq(rosters.teamId, teams.id))
      .where(and(eq(rosters.playerId, playerId), eq(teams.leagueId, leagueId)))
      .limit(1);

    if (existingRoster.length > 0) {
      return NextResponse.json(
        { success: false, error: "Player is already on a roster" },
        { status: 400 }
      );
    }

    // Check if team has enough budget for nomination
    const teamBudget = await getTeamRemainingBudget(userTeam[0].id);
    if (teamBudget < nominationAmount) {
      return NextResponse.json(
        { success: false, error: "Insufficient budget for nomination" },
        { status: 400 }
      );
    }

    // Create nomination
    const nomination = await db
      .insert(draftNominations)
      .values({
        leagueId,
        nominatingTeamId: userTeam[0].id,
        playerId,
        currentBid: nominationAmount,
        highestBidderTeamId: userTeam[0].id,
        startedAt: new Date(),
      })
      .returning();

    // Create initial bid
    await db.insert(draftBids).values({
      nominationId: nomination[0].id,
      teamId: userTeam[0].id,
      amount: nominationAmount,
    });

    // Update draft state
    await db
      .update(draftState)
      .set({
        currentNominationId: nomination[0].id,
        phase: "bidding",
      })
      .where(eq(draftState.leagueId, leagueId));

    return NextResponse.json({
      success: true,
      message: "Player nominated successfully",
      data: {
        nomination: {
          id: nomination[0].id,
          playerId,
          playerName: `${player[0].firstName} ${player[0].lastName}`,
          currentBid: nominationAmount,
          highestBidderId: userTeam[0].id,
          nominatingTeamId: userTeam[0].id,
          startedAt: nomination[0].startedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error nominating player:", error);
    return NextResponse.json(
      { success: false, error: "Failed to nominate player" },
      { status: 500 }
    );
  }
}

async function getTeamRemainingBudget(teamId: string): Promise<number> {
  // Get team budget
  const team = await db
    .select({ budget: teams.budget, leagueId: teams.leagueId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (team.length === 0) {
    return 0;
  }

  // Get league settings for total roster slots
  if (!team[0].leagueId) {
    return 0;
  }

  const leagueQuery = await db
    .select({
      qbSlots: leagues.qbSlots,
      rbSlots: leagues.rbSlots,
      wrSlots: leagues.wrSlots,
      teSlots: leagues.teSlots,
      flexSlots: leagues.flexSlots,
      dstSlots: leagues.dstSlots,
      kSlots: leagues.kSlots,
      benchSlots: leagues.benchSlots,
    })
    .from(leagues)
    .where(eq(leagues.id, team[0].leagueId))
    .limit(1);

  if (leagueQuery.length === 0) {
    return 0;
  }

  const leagueData = leagueQuery[0];
  const totalRosterSlots =
    (leagueData.qbSlots || 1) +
    (leagueData.rbSlots || 2) +
    (leagueData.wrSlots || 2) +
    (leagueData.teSlots || 1) +
    (leagueData.flexSlots || 1) +
    (leagueData.dstSlots || 1) +
    (leagueData.kSlots || 1) +
    (leagueData.benchSlots || 7);

  // Get total spent on roster and current roster count
  const rosterData = await db
    .select({
      totalSpent: sql<number>`COALESCE(SUM(${rosters.price}), 0)`,
      rosterCount: sql<number>`COUNT(${rosters.id})`,
    })
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  const totalSpent = rosterData[0]?.totalSpent || 0;
  const rosterCount = rosterData[0]?.rosterCount || 0;
  const remainingRosterSlots = totalRosterSlots - rosterCount;

  // Calculate available budget minus minimum $1 per remaining slot
  const grossRemainingBudget = (team[0].budget || 200) - totalSpent;
  const minimumReserved = Math.max(0, remainingRosterSlots - 1); // Subtract 1 because current bid counts as 1 slot
  const availableBudget = grossRemainingBudget - minimumReserved;

  return Math.max(0, availableBudget);
}
