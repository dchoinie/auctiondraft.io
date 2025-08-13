import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { draftedPlayers, teams, leagues, nflPlayers } from "@/app/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string; team_id: string }> }
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

    const { league_id: leagueId, team_id: teamId } = resolvedParams;
    const body = await req.json();
    const { playerId, draftPrice } = body;

    // Validate input
    if (!playerId || !draftPrice || typeof draftPrice !== "number" || draftPrice < 0) {
      return NextResponse.json(
        { success: false, error: "Valid player ID and draft price are required" },
        { status: 400 }
      );
    }

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

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to draft players" },
        { status: 403 }
      );
    }

    // Verify regular team exists
    const regularTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.leagueId, leagueId)))
      .limit(1);

    if (regularTeam.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Verify player exists
    const player = await db
      .select()
      .from(nflPlayers)
      .where(eq(nflPlayers.id, playerId))
      .limit(1);

    if (player.length === 0) {
      return NextResponse.json(
        { success: false, error: "Player not found" },
        { status: 404 }
      );
    }

    // Check if player is already drafted in this league
    const existingDraft = await db
      .select()
      .from(draftedPlayers)
      .where(and(eq(draftedPlayers.playerId, playerId), eq(draftedPlayers.leagueId, leagueId)))
      .limit(1);

    if (existingDraft.length > 0) {
      return NextResponse.json(
        { success: false, error: "Player is already drafted in this league" },
        { status: 400 }
      );
    }

    // Check if team has enough budget
    const team = regularTeam[0];
    if (!team || !team.budget || draftPrice > team.budget) {
      return NextResponse.json(
        { success: false, error: "Team does not have enough budget" },
        { status: 400 }
      );
    }

    // Draft the player
    const draftedPlayer = await db
      .insert(draftedPlayers)
      .values({
        teamId: teamId,
        playerId,
        leagueId,
        draftPrice,
        teamType: "regular",
      })
      .returning();

    if (!draftedPlayer[0]) {
      return NextResponse.json(
        { success: false, error: "Failed to create drafted player record" },
        { status: 500 }
      );
    }

    // Update team budget
    await db
      .update(teams)
      .set({ budget: team.budget! - draftPrice })
      .where(eq(teams.id, teamId));

    const draftedPlayerRecord = draftedPlayer[0];
    return NextResponse.json({
      success: true,
      draftedPlayer: {
        id: draftedPlayerRecord.id,
        teamId: draftedPlayerRecord.teamId,
        playerId: draftedPlayerRecord.playerId,
        leagueId: draftedPlayerRecord.leagueId,
        draftPrice: draftedPlayerRecord.draftPrice,
        teamType: draftedPlayerRecord.teamType,
        createdAt: draftedPlayerRecord.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error drafting player for regular team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to draft player" },
      { status: 500 }
    );
  }
}
