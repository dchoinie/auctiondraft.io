import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  leagues,
  teams,
  draftState,
  draftNominations,
  nflPlayers,
  rosters,
} from "@/app/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function GET(
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

    // Verify user is part of the league
    const userTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, userId)))
      .limit(1);

    if (userTeam.length === 0) {
      return NextResponse.json(
        { success: false, error: "Not authorized to access this draft" },
        { status: 403 }
      );
    }

    // Get league info
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

    // Get draft state
    const currentDraftState = await db
      .select()
      .from(draftState)
      .where(eq(draftState.leagueId, leagueId))
      .limit(1);

    // Get all teams with draft order
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId))
      .orderBy(teams.draftOrder);

    // Get current nomination if exists
    let currentNomination = null;
    if (
      currentDraftState.length > 0 &&
      currentDraftState[0].currentNominationId
    ) {
      const nomination = await db
        .select({
          id: draftNominations.id,
          playerId: draftNominations.playerId,
          playerName: sql<string>`${nflPlayers.firstName} || ' ' || ${nflPlayers.lastName}`,
          currentBid: draftNominations.currentBid,
          highestBidderId: draftNominations.highestBidderTeamId,
          nominatingTeamId: draftNominations.nominatingTeamId,
          startedAt: draftNominations.startedAt,
        })
        .from(draftNominations)
        .leftJoin(nflPlayers, eq(draftNominations.playerId, nflPlayers.id))
        .where(
          eq(draftNominations.id, currentDraftState[0].currentNominationId)
        )
        .limit(1);

      currentNomination = nomination[0] || null;
    }

    // Get available players (not on any roster in this league)
    const availablePlayersQuery = await db
      .select({
        id: nflPlayers.id,
        firstName: nflPlayers.firstName,
        lastName: nflPlayers.lastName,
        position: nflPlayers.position,
        team: nflPlayers.team,
        searchRank: nflPlayers.searchRank,
      })
      .from(nflPlayers)
      .leftJoin(
        rosters,
        and(
          eq(rosters.playerId, nflPlayers.id),
          eq(
            rosters.teamId,
            sql`ANY(SELECT id FROM teams WHERE league_id = ${leagueId})`
          )
        )
      )
      .where(isNull(rosters.id))
      .orderBy(nflPlayers.searchRank)
      .limit(100); // Limit for performance

    // Calculate remaining budget and roster spots for each team
    const teamStats = await Promise.all(
      allTeams.map(async (team) => {
        // Get current roster
        const roster = await db
          .select({
            playerId: rosters.playerId,
            price: rosters.price,
            assignedSlot: rosters.assignedSlot,
          })
          .from(rosters)
          .where(eq(rosters.teamId, team.id));

        // Calculate remaining budget
        const totalSpent = roster.reduce(
          (sum, player) => sum + player.price,
          0
        );
        const remainingBudget = (team.budget || 200) - totalSpent;

        // Calculate remaining roster spots
        const rosterSlots = {
          qb: league[0].qbSlots || 1,
          rb: league[0].rbSlots || 2,
          wr: league[0].wrSlots || 2,
          te: league[0].teSlots || 1,
          flex: league[0].flexSlots || 1,
          dst: league[0].dstSlots || 1,
          k: league[0].kSlots || 1,
          bench: league[0].benchSlots || 7,
        };

        const filledSlots = {
          qb: roster.filter((p) => p.assignedSlot === "QB").length,
          rb: roster.filter((p) => p.assignedSlot === "RB").length,
          wr: roster.filter((p) => p.assignedSlot === "WR").length,
          te: roster.filter((p) => p.assignedSlot === "TE").length,
          flex: roster.filter((p) => p.assignedSlot === "FLEX").length,
          dst: roster.filter((p) => p.assignedSlot === "DST").length,
          k: roster.filter((p) => p.assignedSlot === "K").length,
          bench: roster.filter((p) => p.assignedSlot === "BENCH").length,
        };

        const totalRosterSlots = Object.values(rosterSlots).reduce(
          (sum, slots) => sum + slots,
          0
        );
        const totalFilledSlots = Object.values(filledSlots).reduce(
          (sum, slots) => sum + slots,
          0
        );
        const remainingRosterSlots = totalRosterSlots - totalFilledSlots;

        return {
          ...team,
          remainingBudget,
          remainingRosterSlots,
          totalRosterSlots,
          filledSlots,
          roster: roster.length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        league: league[0],
        draftState: currentDraftState[0] || null,
        teams: teamStats,
        currentNomination,
        availablePlayers: availablePlayersQuery,
        userTeam: userTeam[0],
      },
    });
  } catch (error) {
    console.error("Error getting draft state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get draft state" },
      { status: 500 }
    );
  }
}

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
    const { action } = body;

    // Verify user is league owner
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
        { success: false, error: "Only league owner can manage draft" },
        { status: 403 }
      );
    }

    switch (action) {
      case "start":
        return await startDraft(leagueId);
      case "reset":
        return await resetDraft(leagueId);
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing draft:", error);
    return NextResponse.json(
      { success: false, error: "Failed to manage draft" },
      { status: 500 }
    );
  }
}

async function startDraft(leagueId: string) {
  // Check if all teams have draft orders
  const teams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamsWithoutOrder = teams.filter((team) => team.draftOrder === null);
  if (teamsWithoutOrder.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "All teams must have draft orders before starting the draft",
      },
      { status: 400 }
    );
  }

  // Get first team in draft order
  const firstTeam = teams
    .filter((team) => team.draftOrder !== null)
    .sort((a, b) => a.draftOrder! - b.draftOrder!)[0];

  if (!firstTeam) {
    return NextResponse.json(
      { success: false, error: "No teams found with draft order" },
      { status: 400 }
    );
  }

  // Create or update draft state
  const existingDraftState = await db
    .select()
    .from(draftState)
    .where(eq(draftState.leagueId, leagueId))
    .limit(1);

  if (existingDraftState.length > 0) {
    // Update existing draft state
    await db
      .update(draftState)
      .set({
        currentTurnTeamId: firstTeam.id,
        phase: "nominating",
        currentNominationId: null,
        clockEndsAt: null,
      })
      .where(eq(draftState.leagueId, leagueId));
  } else {
    // Create new draft state
    await db.insert(draftState).values({
      leagueId,
      currentTurnTeamId: firstTeam.id,
      phase: "nominating",
    });
  }

  // Mark league as draft started
  await db
    .update(leagues)
    .set({ isDraftStarted: 1 })
    .where(eq(leagues.id, leagueId));

  return NextResponse.json({
    success: true,
    message: "Draft started successfully",
    data: {
      currentTurnTeamId: firstTeam.id,
      phase: "nominating",
    },
  });
}

async function resetDraft(leagueId: string) {
  // Delete all draft-related data
  await db
    .delete(draftNominations)
    .where(eq(draftNominations.leagueId, leagueId));

  await db.delete(draftState).where(eq(draftState.leagueId, leagueId));

  // Clear all rosters
  await db
    .delete(rosters)
    .where(
      eq(
        rosters.teamId,
        sql`ANY(SELECT id FROM teams WHERE league_id = ${leagueId})`
      )
    );

  // Mark league as draft not started
  await db
    .update(leagues)
    .set({ isDraftStarted: 0 })
    .where(eq(leagues.id, leagueId));

  return NextResponse.json({
    success: true,
    message: "Draft reset successfully",
  });
}
