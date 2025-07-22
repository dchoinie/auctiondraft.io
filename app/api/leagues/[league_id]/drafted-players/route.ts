import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { draftedPlayers, nflPlayers, teams } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const resolvedParams = await params;
    const leagueId = resolvedParams.league_id;
    // Get all drafted players for the league, joined with player and team info
    const results = await db
      .select({
        id: draftedPlayers.id,
        draftPrice: draftedPlayers.draftPrice,
        teamId: draftedPlayers.teamId,
        playerId: draftedPlayers.playerId,
        teamName: teams.name,
        playerFirstName: nflPlayers.firstName,
        playerLastName: nflPlayers.lastName,
        playerPosition: nflPlayers.position,
        playerTeam: nflPlayers.team,
      })
      .from(draftedPlayers)
      .leftJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .leftJoin(teams, eq(draftedPlayers.teamId, teams.id))
      .where(eq(draftedPlayers.leagueId, leagueId));

    return NextResponse.json({ success: true, draftedPlayers: results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
