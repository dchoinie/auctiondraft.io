import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, teams } from "@/app/schema";
import { eq, or, ne, and } from "drizzle-orm";

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
        settings: {
          id: leagues.id,
          name: leagues.name,
          ownerId: leagues.ownerId,
          isDraftStarted: leagues.isDraftStarted,
          leagueSize: leagues.leagueSize,
          draftDate: leagues.draftDate,
          draftTime: leagues.draftTime,
          draftLocation: leagues.draftLocation,
          startingBudget: leagues.startingBudget,
          qbSlots: leagues.qbSlots,
          rbSlots: leagues.rbSlots,
          wrSlots: leagues.wrSlots,
          teSlots: leagues.teSlots,
          flexSlots: leagues.flexSlots,
          dstSlots: leagues.dstSlots,
          kSlots: leagues.kSlots,
          benchSlots: leagues.benchSlots,
          draftType: leagues.draftType,
          timerEnabled: leagues.timerEnabled,
          timerDuration: leagues.timerDuration,
        },
      })
      .from(leagues)
      .where(and(eq(leagues.ownerId, userId), ne(leagues.status, "deleted")));

    // Find leagues where user has a team (member)
    const memberLeagues = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        ownerId: leagues.ownerId,
        isDraftStarted: leagues.isDraftStarted,
        createdAt: leagues.createdAt,
        settings: {
          id: leagues.id,
          name: leagues.name,
          ownerId: leagues.ownerId,
          isDraftStarted: leagues.isDraftStarted,
          leagueSize: leagues.leagueSize,
          draftDate: leagues.draftDate,
          draftTime: leagues.draftTime,
          draftLocation: leagues.draftLocation,
          startingBudget: leagues.startingBudget,
          qbSlots: leagues.qbSlots,
          rbSlots: leagues.rbSlots,
          wrSlots: leagues.wrSlots,
          teSlots: leagues.teSlots,
          flexSlots: leagues.flexSlots,
          dstSlots: leagues.dstSlots,
          kSlots: leagues.kSlots,
          benchSlots: leagues.benchSlots,
          draftType: leagues.draftType,
          timerEnabled: leagues.timerEnabled,
          timerDuration: leagues.timerDuration,
        },
      })
      .from(leagues)
      .innerJoin(teams, eq(teams.leagueId, leagues.id))
      .where(and(eq(teams.ownerId, userId), ne(leagues.status, "deleted")));

    // Combine and deduplicate leagues
    const allLeagues = [...ownedLeagues, ...memberLeagues];
    const uniqueLeagues = allLeagues.filter(
      (league, index, self) =>
        index === self.findIndex((l) => l.id === league.id)
    );

    // Format draftDate as YYYY-MM-DD for all leagues
    const formattedLeagues = uniqueLeagues.map((league) => ({
      ...league,
      settings: {
        ...league.settings,
        draftDate: league.settings.draftDate
          ? new Date(league.settings.draftDate).toISOString().split("T")[0]
          : null,
      },
    }));

    return NextResponse.json({
      success: true,
      leagues: formattedLeagues,
    });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
