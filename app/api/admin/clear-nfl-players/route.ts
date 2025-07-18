import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { nflPlayers, apiUpdates } from "@/app/schema";
import { eq } from "drizzle-orm";

/**
 * Platform Admin Endpoint: Clear NFL Players Table
 *
 * This endpoint allows platform administrators to clear all NFL player data
 * from the database. This is useful for starting fresh with new data imports.
 */
export async function POST(req: NextRequest) {
  try {
    // Check if user is admin
    const adminError = await requireAdmin();
    if (adminError) {
      return adminError;
    }

    console.log("NFL players table clearing requested by platform admin");

    // Get current count before clearing
    const currentPlayers = await db.select().from(nflPlayers);
    const currentCount = currentPlayers.length;

    console.log(`Found ${currentCount} players to delete`);

    // Delete all NFL players
    await db.delete(nflPlayers);

    // Also clear any related API update records for the NFL players endpoint
    await db
      .delete(apiUpdates)
      .where(eq(apiUpdates.endpoint, "sleeper_nfl_players"));

    console.log("✅ NFL players table cleared successfully");

    return NextResponse.json({
      success: true,
      message: "NFL players table cleared successfully",
      recordsDeleted: currentCount,
    });
  } catch (error) {
    console.error("Error clearing NFL players table:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
