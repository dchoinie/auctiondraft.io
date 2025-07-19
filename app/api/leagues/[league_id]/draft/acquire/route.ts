import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  teams,
  draftState,
  draftNominations,
  rosters,
  nflPlayers,
  leagues,
  transactions,
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
    const { nominationId } = body;

    if (!nominationId) {
      return NextResponse.json(
        { success: false, error: "Nomination ID required" },
        { status: 400 }
      );
    }

    // Get nomination details
    const nomination = await db
      .select()
      .from(draftNominations)
      .where(eq(draftNominations.id, nominationId))
      .limit(1);

    if (nomination.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nomination not found" },
        { status: 404 }
      );
    }

    const nominationData = nomination[0];

    // Verify nomination is for this league
    if (nominationData.leagueId !== leagueId) {
      return NextResponse.json(
        { success: false, error: "Invalid nomination for this league" },
        { status: 400 }
      );
    }

    // Check if nomination is already ended
    if (nominationData.endedAt) {
      return NextResponse.json(
        { success: false, error: "Nomination already ended" },
        { status: 400 }
      );
    }

    // Get player details
    const player = await db
      .select()
      .from(nflPlayers)
      .where(eq(nflPlayers.id, nominationData.playerId))
      .limit(1);

    if (player.length === 0) {
      return NextResponse.json(
        { success: false, error: "Player not found" },
        { status: 404 }
      );
    }

    const playerData = player[0];

    // Get winning team
    const winningTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.id, nominationData.highestBidderTeamId))
      .limit(1);

    if (winningTeam.length === 0) {
      return NextResponse.json(
        { success: false, error: "Winning team not found" },
        { status: 404 }
      );
    }

    // Get league settings for roster slot assignment
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

    const leagueData = league[0];

    // Determine roster slot assignment
    const assignedSlot = await determineRosterSlot(
      winningTeam[0].id,
      playerData.position,
      leagueData
    );

    if (!assignedSlot) {
      return NextResponse.json(
        { success: false, error: "No available roster slots" },
        { status: 400 }
      );
    }

    // Add player to roster
    const rosterEntry = await db
      .insert(rosters)
      .values({
        teamId: winningTeam[0].id,
        playerId: playerData.id,
        price: nominationData.currentBid,
        assignedSlot,
      })
      .returning();

    // Record transaction
    await db.insert(transactions).values({
      leagueId,
      teamId: winningTeam[0].id,
      playerId: playerData.id,
      amount: nominationData.currentBid,
      type: "win",
    });

    // Mark nomination as ended
    await db
      .update(draftNominations)
      .set({
        endedAt: new Date(),
      })
      .where(eq(draftNominations.id, nominationId));

    // Move to next team's turn
    const nextTeamId = await getNextTeamTurn(
      leagueId,
      nominationData.nominatingTeamId
    );

    // Update draft state
    await db
      .update(draftState)
      .set({
        currentNominationId: null,
        currentTurnTeamId: nextTeamId,
        phase: "nominating",
        clockEndsAt: null,
      })
      .where(eq(draftState.leagueId, leagueId));

    return NextResponse.json({
      success: true,
      message: "Player acquired successfully",
      data: {
        player: {
          id: playerData.id,
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          position: playerData.position,
          team: playerData.team,
        },
        winningTeam: {
          id: winningTeam[0].id,
          name: winningTeam[0].name,
        },
        finalBid: nominationData.currentBid,
        assignedSlot,
        nextTurnTeamId: nextTeamId,
        rosterId: rosterEntry[0].id,
      },
    });
  } catch (error) {
    console.error("Error acquiring player:", error);
    return NextResponse.json(
      { success: false, error: "Failed to acquire player" },
      { status: 500 }
    );
  }
}

async function determineRosterSlot(
  teamId: string,
  playerPosition: string,
  leagueData: any
): Promise<string | null> {
  // Get current roster
  const roster = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  // Count filled slots by position
  const filledSlots = {
    QB: roster.filter((r) => r.assignedSlot === "QB").length,
    RB: roster.filter((r) => r.assignedSlot === "RB").length,
    WR: roster.filter((r) => r.assignedSlot === "WR").length,
    TE: roster.filter((r) => r.assignedSlot === "TE").length,
    FLEX: roster.filter((r) => r.assignedSlot === "FLEX").length,
    SUPERFLEX: roster.filter((r) => r.assignedSlot === "SUPERFLEX").length,
    DST: roster.filter((r) => r.assignedSlot === "DST").length,
    K: roster.filter((r) => r.assignedSlot === "K").length,
    BENCH: roster.filter((r) => r.assignedSlot === "BENCH").length,
  };

  // Try to assign to direct position first
  switch (playerPosition) {
    case "QB":
      if (filledSlots.QB < (leagueData.qbSlots || 1)) {
        return "QB";
      }
      // Try SUPERFLEX if available
      if (filledSlots.SUPERFLEX < (leagueData.superflexSlots || 0)) {
        return "SUPERFLEX";
      }
      break;

    case "RB":
      if (filledSlots.RB < (leagueData.rbSlots || 2)) {
        return "RB";
      }
      // Try FLEX if available
      if (filledSlots.FLEX < (leagueData.flexSlots || 1)) {
        return "FLEX";
      }
      // Try SUPERFLEX if available
      if (filledSlots.SUPERFLEX < (leagueData.superflexSlots || 0)) {
        return "SUPERFLEX";
      }
      break;

    case "WR":
      if (filledSlots.WR < (leagueData.wrSlots || 2)) {
        return "WR";
      }
      // Try FLEX if available
      if (filledSlots.FLEX < (leagueData.flexSlots || 1)) {
        return "FLEX";
      }
      // Try SUPERFLEX if available
      if (filledSlots.SUPERFLEX < (leagueData.superflexSlots || 0)) {
        return "SUPERFLEX";
      }
      break;

    case "TE":
      if (filledSlots.TE < (leagueData.teSlots || 1)) {
        return "TE";
      }
      // Try FLEX if available
      if (filledSlots.FLEX < (leagueData.flexSlots || 1)) {
        return "FLEX";
      }
      // Try SUPERFLEX if available
      if (filledSlots.SUPERFLEX < (leagueData.superflexSlots || 0)) {
        return "SUPERFLEX";
      }
      break;

    case "DST":
      if (filledSlots.DST < (leagueData.dstSlots || 1)) {
        return "DST";
      }
      break;

    case "K":
      if (filledSlots.K < (leagueData.kSlots || 1)) {
        return "K";
      }
      break;
  }

  // If no position slots available, try bench
  if (filledSlots.BENCH < (leagueData.benchSlots || 7)) {
    return "BENCH";
  }

  // No available slots
  return null;
}

async function getNextTeamTurn(
  leagueId: string,
  currentTeamId: string
): Promise<string> {
  // Get all teams with draft order
  const teams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.draftOrder);

  // Find current team index
  const currentTeamIndex = teams.findIndex((team) => team.id === currentTeamId);

  // Get next team (wrap around if at the end)
  const nextTeamIndex = (currentTeamIndex + 1) % teams.length;

  return teams[nextTeamIndex].id;
}
