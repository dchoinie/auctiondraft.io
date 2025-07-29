import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  leagues,
  teams,
  nflPlayers,
  draftedPlayers,
  keepers,
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

    // Get all teams with draft order
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId))
      .orderBy(teams.draftOrder);

    // Note: Draft state and nominations are now managed in PartyKit memory, not in database

    // Get available players (not drafted in this league)
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
        draftedPlayers,
        and(
          eq(draftedPlayers.playerId, nflPlayers.id),
          eq(draftedPlayers.leagueId, leagueId)
        )
      )
      .where(isNull(draftedPlayers.id))
      .orderBy(nflPlayers.searchRank)
      .limit(100); // Limit for performance

    // Calculate remaining budget and roster spots for each team
    const teamStats = await Promise.all(
      allTeams.map(async (team) => {
        // Get current drafted players for this team
        const draftedPlayersForTeam = await db
          .select({
            playerId: draftedPlayers.playerId,
            draftPrice: draftedPlayers.draftPrice,
          })
          .from(draftedPlayers)
          .where(eq(draftedPlayers.teamId, team.id));

        // Get keeper costs for this team
        const keeperCostsForTeam = await db
          .select({
            keeperPrice: keepers.keeperPrice,
          })
          .from(keepers)
          .where(eq(keepers.teamId, team.id));

        // Calculate total spent on drafted players
        const totalDraftedSpent = draftedPlayersForTeam.reduce(
          (sum, player) => sum + (player.draftPrice || 0),
          0
        );

        // Calculate total spent on keepers
        const totalKeeperSpent = keeperCostsForTeam.reduce(
          (sum, keeper) => sum + (keeper.keeperPrice || 0),
          0
        );

        // Calculate remaining budget (starting budget - drafted costs - keeper costs)
        const remainingBudget =
          (team.budget || 200) - totalDraftedSpent - totalKeeperSpent;

        // Calculate remaining roster spots based on league roster size
        const totalRosterSlots =
          (league[0].qbSlots || 0) +
          (league[0].rbSlots || 0) +
          (league[0].wrSlots || 0) +
          (league[0].teSlots || 0) +
          (league[0].flexSlots || 0) +
          (league[0].dstSlots || 0) +
          (league[0].kSlots || 0) +
          (league[0].benchSlots || 0);
        const totalFilledSlots = draftedPlayersForTeam.length;
        const remainingRosterSlots = totalRosterSlots - totalFilledSlots;

        return {
          ...team,
          remainingBudget,
          remainingRosterSlots,
          totalRosterSlots,
          roster: draftedPlayersForTeam.length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        league: league[0],
        draftState: null, // Draft state is managed in PartyKit memory
        teams: teamStats,
        currentNomination: null, // Current nomination is managed in PartyKit memory
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
    const { action, testMode } = body;

    // Check if user is platform admin for test mode
    let isAdmin = false;
    if (testMode) {
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        isAdmin = user.privateMetadata?.isAdmin === true;
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    }

    // Verify user is league owner or admin (for test mode)
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

    if (league[0].ownerId !== userId && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Only league owner or admin can manage draft",
        },
        { status: 403 }
      );
    }

    switch (action) {
      case "start":
        return await startDraft(leagueId, testMode && isAdmin);
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

async function startDraft(leagueId: string, testMode: boolean = false) {
  // Get all teams
  const leagueTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  // Only check for draft orders if not in test mode
  if (!testMode) {
    const teamsWithoutOrder = leagueTeams.filter(
      (team) => team.draftOrder === null
    );
    if (teamsWithoutOrder.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All teams must have draft orders before starting the draft",
        },
        { status: 400 }
      );
    }
  }

  // Get first team in draft order, or first team if in test mode
  const firstTeam = testMode
    ? leagueTeams[0]
    : leagueTeams
        .filter((team) => team.draftOrder !== null)
        .sort((a, b) => a.draftOrder! - b.draftOrder!)[0];

  if (!firstTeam) {
    return NextResponse.json(
      { success: false, error: "No teams found" },
      { status: 400 }
    );
  }

  // Note: Draft state is now managed in PartyKit memory, not in database

  // Mark league as draft started
  await db
    .update(leagues)
    .set({ isDraftStarted: 1 })
    .where(eq(leagues.id, leagueId));

  return NextResponse.json({
    success: true,
    message: "Draft started successfully",
    data: {
      message: "Draft state will be managed in PartyKit memory",
    },
  });
}

async function resetDraft(leagueId: string) {
  // Note: Draft state is managed in PartyKit memory, only clearing drafted players from database

  // Clear all drafted players for this league
  await db.delete(draftedPlayers).where(eq(draftedPlayers.leagueId, leagueId));

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
