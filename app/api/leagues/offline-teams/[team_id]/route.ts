import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { offlineTeams, leagues } from "@/app/schema";
import { eq, and, ne } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ team_id: string }> }
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

    const teamId = resolvedParams.team_id;
    const body = await req.json();

    // Get the team to verify ownership
    const team = await db
      .select()
      .from(offlineTeams)
      .where(eq(offlineTeams.id, teamId))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { success: false, error: "Offline team not found" },
        { status: 404 }
      );
    }

    // Verify league exists and user is owner
    const league = await db
      .select()
      .from(leagues)
      .where(and(eq(leagues.id, team[0].leagueId), ne(leagues.status, "deleted")))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update offline team" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.budget !== undefined) updateData.budget = Number(body.budget);
    if (body.draftOrder !== undefined) updateData.draftOrder = Number(body.draftOrder);

    // Update the team
    await db
      .update(offlineTeams)
      .set(updateData)
      .where(eq(offlineTeams.id, teamId));

    return NextResponse.json({
      success: true,
      message: "Offline team updated successfully",
    });
  } catch (error) {
    console.error("Error updating offline team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update offline team" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ team_id: string }> }
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

    const teamId = resolvedParams.team_id;

    // Get the team to verify ownership
    const team = await db
      .select()
      .from(offlineTeams)
      .where(eq(offlineTeams.id, teamId))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { success: false, error: "Offline team not found" },
        { status: 404 }
      );
    }

    // Verify league exists and user is owner
    const league = await db
      .select()
      .from(leagues)
      .where(and(eq(leagues.id, team[0].leagueId), ne(leagues.status, "deleted")))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete offline team" },
        { status: 403 }
      );
    }

    // Delete the team
    await db.delete(offlineTeams).where(eq(offlineTeams.id, teamId));

    return NextResponse.json({
      success: true,
      message: "Offline team deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting offline team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete offline team" },
      { status: 500 }
    );
  }
} 