import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nflPlayers } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const playerId = resolvedParams.id;
    const player = await db
      .select()
      .from(nflPlayers)
      .where(eq(nflPlayers.id, playerId))
      .limit(1);

    if (!player.length) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ player: player[0] });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
