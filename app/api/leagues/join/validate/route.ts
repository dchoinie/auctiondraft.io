import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leagues, userProfiles } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { leagueId, joinCode } = await req.json();
    if (!leagueId || !joinCode) {
      return NextResponse.json(
        { success: false, error: "Missing leagueId or joinCode" },
        { status: 400 }
      );
    }

    // Find the league by ID
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, leagueId),
    });

    if (!league) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league.joinCode !== joinCode) {
      return NextResponse.json(
        { success: false, error: "Invalid join code" },
        { status: 401 }
      );
    }

    // Get the admin/owner's name
    let adminName = null;
    if (league.ownerId) {
      const admin = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.id, league.ownerId),
      });
      if (admin) {
        adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim();
      }
    }

    // Return league and admin info
    return NextResponse.json({
      success: true,
      leagueName: league.name,
      adminName,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
