import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  teams,
  draftState,
  draftNominations,
  draftBids,
  rosters,
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
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid bid amount" },
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
        { success: false, error: "Not authorized to bid in this draft" },
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

    // Check if draft is in bidding phase
    if (draftStateData.phase !== "bidding") {
      return NextResponse.json(
        { success: false, error: "Not in bidding phase" },
        { status: 400 }
      );
    }

    // Check if there's an active nomination
    if (!draftStateData.currentNominationId) {
      return NextResponse.json(
        { success: false, error: "No active nomination" },
        { status: 400 }
      );
    }

    // Get current nomination
    const nomination = await db
      .select()
      .from(draftNominations)
      .where(eq(draftNominations.id, draftStateData.currentNominationId))
      .limit(1);

    if (nomination.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nomination not found" },
        { status: 404 }
      );
    }

    const nominationData = nomination[0];

    // Check if bid is higher than current bid
    if (!nominationData.currentBid || amount <= nominationData.currentBid) {
      return NextResponse.json(
        { success: false, error: "Bid must be higher than current bid" },
        { status: 400 }
      );
    }

    // Check if team has enough budget
    const teamBudget = await getTeamRemainingBudget(userTeam[0].id);
    if (teamBudget < amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient budget for bid" },
        { status: 400 }
      );
    }

    // Update nomination with new highest bid
    await db
      .update(draftNominations)
      .set({
        currentBid: amount,
        highestBidderTeamId: userTeam[0].id,
      })
      .where(eq(draftNominations.id, nominationData.id));

    // Create bid record
    const bid = await db
      .insert(draftBids)
      .values({
        nominationId: nominationData.id,
        teamId: userTeam[0].id,
        amount,
      })
      .returning();

    // Clear any active countdown (this would be handled by PartyKit in real-time)
    await db
      .update(draftState)
      .set({
        clockEndsAt: null,
      })
      .where(eq(draftState.leagueId, leagueId));

    return NextResponse.json({
      success: true,
      message: "Bid placed successfully",
      data: {
        bid: {
          id: bid[0].id,
          teamId: userTeam[0].id,
          amount,
          timestamp: bid[0].createdAt,
        },
        nomination: {
          id: nominationData.id,
          currentBid: amount,
          highestBidderId: userTeam[0].id,
        },
      },
    });
  } catch (error) {
    console.error("Error placing bid:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place bid" },
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

  const league = await db
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

  if (league.length === 0) {
    return 0;
  }

  const leagueData = league[0];
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
