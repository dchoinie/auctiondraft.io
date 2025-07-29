import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, teams, userProfiles } from "@/app/schema";
import { eq, and } from "drizzle-orm";

// GET: Get specific team details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string; team_id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { league_id: leagueId, team_id: teamId } = resolvedParams;

    // Get team with owner information
    const team = await db
      .select({
        id: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        leagueId: teams.leagueId,
        budget: teams.budget,
        createdAt: teams.createdAt,
        ownerFirstName: userProfiles.firstName,
        ownerLastName: userProfiles.lastName,
        ownerEmail: userProfiles.email,
      })
      .from(teams)
      .leftJoin(userProfiles, eq(teams.ownerId, userProfiles.id))
      .where(and(eq(teams.id, teamId), eq(teams.leagueId, leagueId)))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      team: team[0],
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// PUT: Update team (name, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string; team_id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { league_id: leagueId, team_id: teamId } = resolvedParams;
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Team name is required" },
        { status: 400 }
      );
    }

    // Get team and verify permissions
    const team = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.leagueId, leagueId)))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Get league to check if user is league owner
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

    // Check if user is team owner or league owner
    const isTeamOwner = team[0].ownerId === userId;
    const isLeagueOwner = league[0].ownerId === userId;

    if (!isTeamOwner && !isLeagueOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized to update this team",
        },
        { status: 403 }
      );
    }

    // Update the team
    const updatedTeam = await db
      .update(teams)
      .set({
        name: name.trim(),
      })
      .where(eq(teams.id, teamId))
      .returning();

    return NextResponse.json({
      success: true,
      team: updatedTeam[0],
      message: "Team updated successfully",
    });
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update team" },
      { status: 500 }
    );
  }
}

// DELETE: Remove team from league
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string; team_id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { league_id: leagueId, team_id: teamId } = resolvedParams;

    // Get team and verify it exists
    const team = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.leagueId, leagueId)))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Get league to check if user is league owner
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

    // Check if user is team owner or league owner
    const isTeamOwner = team[0].ownerId === userId;
    const isLeagueOwner = league[0].ownerId === userId;

    if (!isTeamOwner && !isLeagueOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized to delete this team",
        },
        { status: 403 }
      );
    }

    // Check if draft has started (prevent deletion if draft is active)
    if (league[0].isDraftStarted === 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete team after draft has started",
        },
        { status: 400 }
      );
    }

    // Delete the team
    await db.delete(teams).where(eq(teams.id, teamId));

    return NextResponse.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
