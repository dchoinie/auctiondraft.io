import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { keepers, draftedPlayers, nflPlayers, teams } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
) {
  try {
    const { league_id } = await params;
    const { team_id, player_id, amount } = await req.json();
    if (!team_id || !league_id || !player_id || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert into keepers table
    await db.insert(keepers).values({
      leagueId: league_id,
      teamId: team_id,
      playerId: player_id,
      keeperPrice: amount,
    });

    // Insert into drafted_players table
    await db.insert(draftedPlayers).values({
      leagueId: league_id,
      teamId: team_id,
      playerId: player_id,
      draftPrice: amount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
) {
  try {
    const { league_id } = await params;
    // Get all keepers for this league, join player and team info
    const results = await db
      .select()
      .from(keepers)
      .where(eq(keepers.leagueId, league_id));
    // Optionally join player and team info
    // (for now, just return the raw keepers, frontend can join if needed)
    return NextResponse.json({ keepers: results });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
