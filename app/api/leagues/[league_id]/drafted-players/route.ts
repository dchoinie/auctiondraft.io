import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { draftedPlayers, nflPlayers, teams, offlineTeams } from "@/app/schema";
import { eq, or } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const leagueId = resolvedParams.league_id;
    // Get all drafted players for the league, joined with player and team info
    // This query handles both regular teams and offline teams using a UNION approach
    const regularTeamResults = await db
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
      .innerJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .innerJoin(teams, eq(draftedPlayers.teamId, teams.id))
      .where(eq(draftedPlayers.leagueId, leagueId));

    const offlineTeamResults = await db
      .select({
        id: draftedPlayers.id,
        draftPrice: draftedPlayers.draftPrice,
        teamId: draftedPlayers.teamId,
        playerId: draftedPlayers.playerId,
        teamName: offlineTeams.name,
        playerFirstName: nflPlayers.firstName,
        playerLastName: nflPlayers.lastName,
        playerPosition: nflPlayers.position,
        playerTeam: nflPlayers.team,
      })
      .from(draftedPlayers)
      .innerJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .innerJoin(offlineTeams, eq(draftedPlayers.teamId, offlineTeams.id))
      .where(eq(draftedPlayers.leagueId, leagueId));

    // Combine both results
    const allResults = [...regularTeamResults, ...offlineTeamResults];

    return NextResponse.json({ success: true, draftedPlayers: allResults });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
