import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nflPlayers } from "@/app/schema";
import { inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { playerIds } = await req.json();

    if (!playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json(
        { success: false, error: "playerIds array is required" },
        { status: 400 }
      );
    }

    // Query database for players by sleeper_id
    const players = await db
      .select({
        sleeperId: nflPlayers.sleeperId,
        firstName: nflPlayers.firstName,
        lastName: nflPlayers.lastName,
        position: nflPlayers.position,
        team: nflPlayers.team
      })
      .from(nflPlayers)
      .where(inArray(nflPlayers.sleeperId, playerIds));

    return NextResponse.json({
      success: true,
      players
    });
  } catch (error) {
    console.error("Error looking up players:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lookup players" },
      { status: 500 }
    );
  }
} 