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

    // Find leagues where user is either the owner or has a team
    const userLeagues = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        ownerId: leagues.ownerId,
        isDraftStarted: leagues.isDraftStarted,
        createdAt: leagues.createdAt,
      })
      .from(leagues)
      .leftJoin(teams, eq(teams.leagueId, leagues.id))
      .where(or(eq(leagues.ownerId, userId), eq(teams.ownerId, userId)))
      .groupBy(leagues.id);

    return NextResponse.json({
      success: true,
      leagues: userLeagues,
    });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
