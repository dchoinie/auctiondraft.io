import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const resolvedParams = await params;
    console.log(
      "GET /api/leagues/[league_id]/settings called with:",
      resolvedParams
    );
    const { userId } = await auth();

    console.log("User ID:", userId);
    if (!userId) {
      console.log("No user ID found, returning 401");
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const leagueId = resolvedParams.league_id;
    console.log("League ID:", leagueId);

    // Fetch league settings
    console.log("Querying database for league:", leagueId);
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    console.log("Query result:", league);
    if (league.length === 0) {
      console.log("League not found, returning 404");
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    const leagueData = league[0];
    console.log("League data:", leagueData);

    // Check if user is the league owner
    console.log("Checking ownership:", leagueData.ownerId, "vs", userId);
    if (leagueData.ownerId !== userId) {
      console.log("User not authorized, returning 403");
      return NextResponse.json(
        { success: false, error: "Not authorized to view these settings" },
        { status: 403 }
      );
    }

    const responseData = {
      success: true,
      league: {
        id: leagueData.id,
        name: leagueData.name,
        ownerId: leagueData.ownerId,
        leagueSize: leagueData.leagueSize || 10,
        draftDate: leagueData.draftDate?.toISOString().split("T")[0] || null,
        draftTime: leagueData.draftTime || null,
        draftLocation: leagueData.draftLocation || null,
        rosterSize: leagueData.rosterSize || 16,
        startingBudget: leagueData.startingBudget || 200,
        qbSlots: leagueData.qbSlots || 1,
        rbSlots: leagueData.rbSlots || 2,
        wrSlots: leagueData.wrSlots || 2,
        teSlots: leagueData.teSlots || 1,
        flexSlots: leagueData.flexSlots || 1,
        dstSlots: leagueData.dstSlots || 1,
        kSlots: leagueData.kSlots || 1,
        benchSlots: leagueData.benchSlots || 7,
      },
    };

    console.log("Returning successful response:", responseData);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching league settings:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack available"
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch league settings" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const resolvedParams = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const leagueId = resolvedParams.league_id;
    const body = await req.json();

    // Verify league exists and user is owner
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update these settings" },
        { status: 403 }
      );
    }

    // Validate and update league settings
    const updateData: Partial<typeof leagues.$inferInsert> = {};

    if (body.name) updateData.name = body.name;
    if (body.leagueSize) updateData.leagueSize = parseInt(body.leagueSize);
    if (body.draftDate) updateData.draftDate = new Date(body.draftDate);
    if (body.draftTime) updateData.draftTime = body.draftTime;
    if (body.draftLocation !== undefined)
      updateData.draftLocation = body.draftLocation;
    if (body.rosterSize) updateData.rosterSize = parseInt(body.rosterSize);
    if (body.startingBudget)
      updateData.startingBudget = parseInt(body.startingBudget);
    if (body.qbSlots !== undefined) updateData.qbSlots = parseInt(body.qbSlots);
    if (body.rbSlots !== undefined) updateData.rbSlots = parseInt(body.rbSlots);
    if (body.wrSlots !== undefined) updateData.wrSlots = parseInt(body.wrSlots);
    if (body.teSlots !== undefined) updateData.teSlots = parseInt(body.teSlots);
    if (body.flexSlots !== undefined)
      updateData.flexSlots = parseInt(body.flexSlots);
    if (body.dstSlots !== undefined)
      updateData.dstSlots = parseInt(body.dstSlots);
    if (body.kSlots !== undefined) updateData.kSlots = parseInt(body.kSlots);
    if (body.benchSlots !== undefined)
      updateData.benchSlots = parseInt(body.benchSlots);

    // Update the league
    await db.update(leagues).set(updateData).where(eq(leagues.id, leagueId));

    return NextResponse.json({
      success: true,
      message: "League settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating league settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update league settings" },
      { status: 500 }
    );
  }
}
