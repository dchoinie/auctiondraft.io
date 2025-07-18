import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, teams } from "@/app/schema";
import { eq, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

    console.log("Fetching leagues for user:", userId);

    // Find leagues where user is the owner
    const ownedLeagues = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        ownerId: leagues.ownerId,
        isDraftStarted: leagues.isDraftStarted,
        createdAt: leagues.createdAt,
      })
      .from(leagues)
      .where(eq(leagues.ownerId, userId));

    // Find leagues where user has a team (member)
    const memberLeagues = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        ownerId: leagues.ownerId,
        isDraftStarted: leagues.isDraftStarted,
        createdAt: leagues.createdAt,
      })
      .from(leagues)
      .innerJoin(teams, eq(teams.leagueId, leagues.id))
      .where(eq(teams.ownerId, userId));

    // Combine and deduplicate leagues
    const allLeagues = [...ownedLeagues, ...memberLeagues];
    const uniqueLeagues = allLeagues.filter(
      (league, index, self) =>
        index === self.findIndex((l) => l.id === league.id)
    );

    console.log("Found leagues:", uniqueLeagues);

    return NextResponse.json({
      success: true,
      leagues: uniqueLeagues,
    });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
