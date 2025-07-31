import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { offlineTeams, leagues } from "@/app/schema";
import { eq, and, ne } from "drizzle-orm";

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
      .where(and(eq(leagues.id, leagueId), ne(leagues.status, "deleted")))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete offline teams" },
        { status: 403 }
      );
    }

    // Check if league is in offline mode
    if (league[0].draftMode !== "offline") {
      return NextResponse.json(
        { success: false, error: "Bulk delete is only available for offline draft mode" },
        { status: 400 }
      );
    }

    // Get count of teams to be deleted
    const teamsToDelete = await db
      .select()
      .from(offlineTeams)
      .where(eq(offlineTeams.leagueId, leagueId));

    if (teamsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No offline teams to delete",
        deletedCount: 0,
      });
    }

    // Delete all offline teams for the league
    await db.delete(offlineTeams).where(eq(offlineTeams.leagueId, leagueId));

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${teamsToDelete.length} offline team${teamsToDelete.length === 1 ? "" : "s"}`,
      deletedCount: teamsToDelete.length,
    });
  } catch (error) {
    console.error("Error bulk deleting offline teams:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete offline teams" },
      { status: 500 }
    );
  }
} 