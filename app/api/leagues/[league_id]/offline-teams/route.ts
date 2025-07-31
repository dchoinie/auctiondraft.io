import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { offlineTeams, leagues, teams, userProfiles } from "@/app/schema";
import { eq, and, ne } from "drizzle-orm";
import { calculateRosterInfo } from "@/lib/utils";

export async function GET(
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
        { success: false, error: "Not authorized to view offline teams" },
        { status: 403 }
      );
    }

    // Fetch offline teams for the league
    const offlineTeamsList = await db
      .select()
      .from(offlineTeams)
      .where(eq(offlineTeams.leagueId, leagueId))
      .orderBy(offlineTeams.draftOrder);

    // Calculate roster information based on league settings
    const rosterInfo = calculateRosterInfo({
      qbSlots: league[0].qbSlots,
      rbSlots: league[0].rbSlots,
      wrSlots: league[0].wrSlots,
      teSlots: league[0].teSlots,
      flexSlots: league[0].flexSlots,
      dstSlots: league[0].dstSlots,
      kSlots: league[0].kSlots,
      benchSlots: league[0].benchSlots,
    });

    return NextResponse.json({
      success: true,
      teams: offlineTeamsList.map((team) => ({
        id: team.id,
        name: team.name,
        leagueId: team.leagueId,
        budget: team.budget,
        draftOrder: team.draftOrder,
        createdAt: team.createdAt.toISOString(),
        roster: rosterInfo,
      })),
    });
  } catch (error) {
    console.error("Error fetching offline teams:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch offline teams" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const body = await req.json();
    const { name, budget } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Team name is required" },
        { status: 400 }
      );
    }

    if (!budget || typeof budget !== "number" || budget <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid budget is required" },
        { status: 400 }
      );
    }

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
        { success: false, error: "Not authorized to create offline teams" },
        { status: 403 }
      );
    }

    // Check if league is in offline mode
    if (league[0].draftMode !== "offline") {
      return NextResponse.json(
        { success: false, error: "Offline teams can only be created in offline draft mode" },
        { status: 400 }
      );
    }

    // Get current team count to set draft order
    const existingTeams = await db
      .select()
      .from(offlineTeams)
      .where(eq(offlineTeams.leagueId, leagueId));

    const draftOrder = existingTeams.length + 1;

    // Create the offline team
    const newTeam = await db
      .insert(offlineTeams)
      .values({
        name: name.trim(),
        leagueId,
        budget,
        draftOrder,
      })
      .returning();

    // Calculate roster information based on league settings
    const rosterInfo = calculateRosterInfo({
      qbSlots: league[0].qbSlots,
      rbSlots: league[0].rbSlots,
      wrSlots: league[0].wrSlots,
      teSlots: league[0].teSlots,
      flexSlots: league[0].flexSlots,
      dstSlots: league[0].dstSlots,
      kSlots: league[0].kSlots,
      benchSlots: league[0].benchSlots,
    });

    return NextResponse.json({
      success: true,
      team: {
        id: newTeam[0].id,
        name: newTeam[0].name,
        leagueId: newTeam[0].leagueId,
        budget: newTeam[0].budget,
        draftOrder: newTeam[0].draftOrder,
        createdAt: newTeam[0].createdAt.toISOString(),
        roster: rosterInfo,
      },
    });
  } catch (error) {
    console.error("Error creating offline team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create offline team" },
      { status: 500 }
    );
  }
} 