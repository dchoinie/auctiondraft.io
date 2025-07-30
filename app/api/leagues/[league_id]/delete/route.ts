import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { 
  leagues, 
  teams, 
  draftedPlayers, 
  draftStateHistory, 
  keepers, 
  leagueInvitations 
} from "@/app/schema";
import { eq, ne } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
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

    // Check if league is already deleted
    if (league[0].status === "deleted") {
      return NextResponse.json(
        { success: false, error: "League has already been deleted" },
        { status: 400 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this league" },
        { status: 403 }
      );
    }

    // Check if draft has started
    if (league[0].isDraftStarted === 1) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a league that has started its draft" },
        { status: 400 }
      );
    }

    // Delete all associated data in the correct order to avoid foreign key constraints
    // 1. Delete drafted players
    await db
      .delete(draftedPlayers)
      .where(eq(draftedPlayers.leagueId, leagueId));

    // 2. Delete draft state history
    await db
      .delete(draftStateHistory)
      .where(eq(draftStateHistory.leagueId, leagueId));

    // 3. Delete keepers
    await db
      .delete(keepers)
      .where(eq(keepers.leagueId, leagueId));

    // 4. Delete league invitations
    await db
      .delete(leagueInvitations)
      .where(eq(leagueInvitations.leagueId, leagueId));

    // 5. Delete teams (this will cascade to any team-specific data)
    await db
      .delete(teams)
      .where(eq(teams.leagueId, leagueId));

    // 6. Soft delete the league by setting status to 'deleted'
    await db
      .update(leagues)
      .set({ status: "deleted" })
      .where(eq(leagues.id, leagueId));

    return NextResponse.json({
      success: true,
      message: "League deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting league:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete league" },
      { status: 500 }
    );
  }
} 