import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nflPlayers } from "@/app/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Get total count of players
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(nflPlayers);
    const totalCount = totalCountResult[0].count;

    // Get paginated players, sorted by search_rank with players on teams first
    const players = await db
      .select({
        id: nflPlayers.id,
        firstName: nflPlayers.firstName,
        lastName: nflPlayers.lastName,
        position: nflPlayers.position,
        team: nflPlayers.team,
        searchRank: nflPlayers.searchRank,
      })
      .from(nflPlayers)
      .orderBy(
        // Players on teams first, then players without teams
        sql`CASE 
          WHEN ${nflPlayers.team} IS NOT NULL THEN 0 
          ELSE 1 
        END`,
        nflPlayers.searchRank
      )
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      players,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
