import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, teams, userProfiles } from "@/app/schema";
import { eq, and } from "drizzle-orm";

// GET: List all teams in a league
export async function GET(
  req: NextRequest,
  { params }: { params: { league_id: string } }
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
    const leagueId = resolvedParams.league_id;

    // Verify league exists
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

    // Get all teams in the league with owner information
    const leagueTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        budget: teams.budget,
        createdAt: teams.createdAt,
        ownerFirstName: userProfiles.firstName,
        ownerLastName: userProfiles.lastName,
        ownerEmail: userProfiles.email,
        draftOrder: teams.draftOrder,
      })
      .from(teams)
      .leftJoin(userProfiles, eq(teams.ownerId, userProfiles.id))
      .where(eq(teams.leagueId, leagueId));

    return NextResponse.json({
      success: true,
      teams: leagueTeams,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST: Create a new team (admin or user creating their own team)
export async function POST(
  req: NextRequest,
  { params }: { params: { league_id: string } }
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
    const leagueId = resolvedParams.league_id;
    const body = await req.json();
    const { name, ownerId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Team name is required" },
        { status: 400 }
      );
    }

    if (!ownerId || typeof ownerId !== "string") {
      return NextResponse.json(
        { success: false, error: "Team owner ID is required" },
        { status: 400 }
      );
    }

    // Verify league exists
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

    // Check authorization: either league owner (admin) or user creating their own team
    const isLeagueOwner = league[0].ownerId === userId;
    const isCreatingOwnTeam = ownerId === userId;

    if (!isLeagueOwner && !isCreatingOwnTeam) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized to create teams in this league",
        },
        { status: 403 }
      );
    }

    // Check if league is full
    const existingTeams = await db
      .select({ count: teams.id })
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    if (existingTeams.length >= (league[0].leagueSize || 10)) {
      return NextResponse.json(
        { success: false, error: "League is full" },
        { status: 400 }
      );
    }

    // Check if user already has a team in this league
    const existingTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, ownerId)))
      .limit(1);

    if (existingTeam.length > 0) {
      return NextResponse.json(
        { success: false, error: "User already has a team in this league" },
        { status: 400 }
      );
    }

    // Verify the owner exists
    const owner = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, ownerId))
      .limit(1);

    if (owner.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team owner not found" },
        { status: 404 }
      );
    }

    // Create the team
    const newTeam = await db
      .insert(teams)
      .values({
        name: name.trim(),
        ownerId: ownerId,
        leagueId: leagueId,
        budget: league[0].startingBudget || 200,
      })
      .returning();

    return NextResponse.json({
      success: true,
      team: {
        ...newTeam[0],
        ownerFirstName: owner[0].firstName,
        ownerLastName: owner[0].lastName,
        ownerEmail: owner[0].email,
      },
      message: "Team created successfully",
    });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create team" },
      { status: 500 }
    );
  }
}
