import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  seedNFLPlayers,
  shouldRefreshPlayerData,
} from "@/lib/nflPlayerSeeding";

/**
 * Platform Admin Endpoint: Seed NFL Players
 *
 * This endpoint is used by platform administrators to manually seed/update
 * the NFL players database from the Sleeper API. It respects the 24-hour
 * rate limit and should only be called when needed.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("NFL player seeding requested by platform admin:", userId);

    // Check if we need to refresh player data
    const needsRefresh = await shouldRefreshPlayerData();

    if (!needsRefresh) {
      console.log("Player data is up to date, skipping refresh");
      return NextResponse.json({
        success: true,
        message: "Player data is already up to date",
        playersCreated: 0,
        playersUpdated: 0,
        skipped: true,
      });
    }

    console.log("Player data needs refresh, starting seeding process...");

    // Seed the players
    const result = await seedNFLPlayers();

    if (result.success) {
      console.log("NFL player seeding completed successfully");
      return NextResponse.json({
        success: true,
        message: "NFL players seeded successfully",
        playersCreated: result.playersCreated,
        playersUpdated: result.playersUpdated,
        skipped: false,
      });
    } else {
      console.error("NFL player seeding failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to seed NFL players",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in seed-players endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
