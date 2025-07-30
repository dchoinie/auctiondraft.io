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
    const { 
      name,
      leagueSize,
      draftDate,
      draftTime,
      draftLocation,
      startingBudget,
      qbSlots,
      rbSlots,
      wrSlots,
      teSlots,
      flexSlots,
      dstSlots,
      kSlots,
      benchSlots,
      draftType,
      timerEnabled,
      timerDuration,
      joinCode
    } = body;

    console.log("Creating league for user:", userId, "with name:", name);

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

    console.log("User credits:", user.leagueCredits);

    if (!user.leagueCredits || user.leagueCredits < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient league credits",
        },
        { status: 400 }
      );
    }

    // Prepare league data with all settings
    const leagueData: any = {
      name: name.trim(),
      ownerId: userId,
      isDraftStarted: 0,
    };

    // Add all the settings fields if they exist
    if (leagueSize !== undefined) leagueData.leagueSize = Number(leagueSize);
    if (draftDate) leagueData.draftDate = new Date(draftDate + "T00:00:00Z");
    if (draftTime) leagueData.draftTime = draftTime;
    if (draftLocation !== undefined) leagueData.draftLocation = draftLocation;
    if (startingBudget !== undefined) leagueData.startingBudget = Number(startingBudget);
    if (qbSlots !== undefined) leagueData.qbSlots = Number(qbSlots);
    if (rbSlots !== undefined) leagueData.rbSlots = Number(rbSlots);
    if (wrSlots !== undefined) leagueData.wrSlots = Number(wrSlots);
    if (teSlots !== undefined) leagueData.teSlots = Number(teSlots);
    if (flexSlots !== undefined) leagueData.flexSlots = Number(flexSlots);
    if (dstSlots !== undefined) leagueData.dstSlots = Number(dstSlots);
    if (kSlots !== undefined) leagueData.kSlots = Number(kSlots);
    if (benchSlots !== undefined) leagueData.benchSlots = Number(benchSlots);
    if (draftType) leagueData.draftType = draftType;
    if (timerEnabled !== undefined) leagueData.timerEnabled = Number(timerEnabled);
    if (timerDuration !== undefined) leagueData.timerDuration = Number(timerDuration);
    if (joinCode !== undefined) leagueData.joinCode = joinCode;

    // Create the league
    const newLeague = await db
      .insert(leagues)
      .values(leagueData)
      .returning();

    console.log("League created:", newLeague[0]);

    // Deduct one credit from user
    await db
      .update(userProfiles)
      .set({
        leagueCredits: user.leagueCredits - 1,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));

    console.log("Credits deducted. New credit count:", user.leagueCredits - 1);

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
