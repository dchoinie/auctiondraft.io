import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, userProfiles } from "@/app/schema";
import { eq } from "drizzle-orm";
import { getUserFromDatabase } from "@/lib/userSync";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "League name is required",
        },
        { status: 400 }
      );
    }

    // Check if user has credits
    const user = await getUserFromDatabase(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    if (!user.leagueCredits || user.leagueCredits < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient league credits",
        },
        { status: 400 }
      );
    }

    // Create the league
    const newLeague = await db
      .insert(leagues)
      .values({
        name: name.trim(),
        ownerId: userId,
        isDraftStarted: 0,
      })
      .returning();

    // Deduct one credit from user
    await db
      .update(userProfiles)
      .set({
        leagueCredits: user.leagueCredits - 1,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));

    return NextResponse.json({
      success: true,
      league: newLeague[0],
      message: "League created successfully",
    });
  } catch (error) {
    console.error("Error creating league:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create league" },
      { status: 500 }
    );
  }
}
