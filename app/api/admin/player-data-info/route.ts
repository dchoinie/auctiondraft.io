import { NextRequest, NextResponse } from "next/server";
import { getLastPlayerUpdate, getPlayerCount } from "@/lib/nflPlayerSeeding";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const adminError = await requireAdmin();
    if (adminError) {
      return adminError;
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
