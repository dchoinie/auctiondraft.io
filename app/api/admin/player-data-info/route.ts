import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLastPlayerUpdate, getPlayerCount } from "@/lib/nflPlayerSeeding";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get player data information
    const [lastUpdate, playerCount] = await Promise.all([
      getLastPlayerUpdate(),
      getPlayerCount(),
    ]);

    return NextResponse.json({
      success: true,
      lastUpdated: lastUpdate?.lastUpdated || null,
      playerCount,
      status: lastUpdate?.status || "unknown",
    });
  } catch (error) {
    console.error("Error fetching player data info:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
