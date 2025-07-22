import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { keepers, draftedPlayers } from "@/app/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { league_id: string; keeper_id: string } }
) {
  try {
    const leagueId = params.league_id;
    const keeperId = params.keeper_id;
    // Find the keeper row
    const [keeper] = await db
      .select()
      .from(keepers)
      .where(eq(keepers.id, keeperId));
    if (!keeper) {
      return NextResponse.json({ error: "Keeper not found" }, { status: 404 });
    }
    if (!keeper.teamId || !keeper.playerId) {
      return NextResponse.json(
        { error: "Invalid keeper data" },
        { status: 400 }
      );
    }
    // Delete from keepers table
    await db.delete(keepers).where(eq(keepers.id, keeperId));
    // Delete from drafted_players table (by league, team, player)
    await db
      .delete(draftedPlayers)
      .where(
        and(
          eq(draftedPlayers.leagueId, leagueId),
          eq(draftedPlayers.teamId, keeper.teamId),
          eq(draftedPlayers.playerId, keeper.playerId)
        )
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
