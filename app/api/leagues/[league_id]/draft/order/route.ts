import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { teams, leagues } from "@/app/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
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

    // Verify user is part of the league
    const userTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, userId)))
      .limit(1);

    if (userTeam.length === 0) {
      return NextResponse.json(
        { success: false, error: "Not authorized to view this draft order" },
        { status: 403 }
      );
    }

    // Get all teams with draft order
    const leagueTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId))
      .orderBy(teams.draftOrder);

    return NextResponse.json({
      success: true,
      data: {
        teams: leagueTeams.map((team) => ({
          id: team.id,
          name: team.name,
          ownerId: team.ownerId,
          draftOrder: team.draftOrder,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting draft order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get draft order" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
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
    const { action, draftOrder } = body;

    // Verify user is league owner
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .where(ne(leagues.status, "deleted"))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    if (league[0].ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only league owner can manage draft order" },
        { status: 403 }
      );
    }

    // Check if draft has started
    if (league[0].isDraftStarted) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot change draft order after draft has started",
        },
        { status: 400 }
      );
    }

    if (action === "randomize") {
      return await randomizeDraftOrder(leagueId);
    } else if (action === "set" && draftOrder) {
      return await setDraftOrder(leagueId, draftOrder);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action or missing draft order" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error managing draft order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to manage draft order" },
      { status: 500 }
    );
  }
}

async function randomizeDraftOrder(leagueId: string) {
  // Get all teams in the league
  const leagueTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  if (leagueTeams.length === 0) {
    return NextResponse.json(
      { success: false, error: "No teams found in league" },
      { status: 400 }
    );
  }

  // Shuffle the teams
  const shuffledTeams = [...leagueTeams].sort(() => Math.random() - 0.5);

  // Update draft order for each team
  const updates = shuffledTeams.map((team, index) =>
    db
      .update(teams)
      .set({ draftOrder: index + 1 })
      .where(eq(teams.id, team.id))
  );

  await Promise.all(updates);

  // Get updated teams
  const updatedTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.draftOrder);

  return NextResponse.json({
    success: true,
    message: "Draft order randomized successfully",
    data: {
      teams: updatedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        ownerId: team.ownerId,
        draftOrder: team.draftOrder,
      })),
    },
  });
}

async function setDraftOrder(
  leagueId: string,
  draftOrder: { [teamId: string]: number }
) {
  // Get all teams in the league
  const leagueTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  if (leagueTeams.length === 0) {
    return NextResponse.json(
      { success: false, error: "No teams found in league" },
      { status: 400 }
    );
  }

  // Validate draft order
  const teamIds = leagueTeams.map((team) => team.id);
  const providedTeamIds = Object.keys(draftOrder);
  const providedOrders = Object.values(draftOrder);

  // Check if all teams are included
  if (providedTeamIds.length !== teamIds.length) {
    return NextResponse.json(
      { success: false, error: "Draft order must include all teams" },
      { status: 400 }
    );
  }

  // Check if all team IDs are valid
  const invalidTeamIds = providedTeamIds.filter((id) => !teamIds.includes(id));
  if (invalidTeamIds.length > 0) {
    return NextResponse.json(
      { success: false, error: "Invalid team IDs in draft order" },
      { status: 400 }
    );
  }

  // Check if orders are sequential from 1 to n
  const sortedOrders = [...providedOrders].sort((a, b) => a - b);
  const expectedOrders = Array.from(
    { length: teamIds.length },
    (_, i) => i + 1
  );

  if (!sortedOrders.every((order, index) => order === expectedOrders[index])) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Draft order must be sequential numbers from 1 to " + teamIds.length,
      },
      { status: 400 }
    );
  }

  // Update draft order for each team
  const updates = Object.entries(draftOrder).map(([teamId, order]) =>
    db.update(teams).set({ draftOrder: order }).where(eq(teams.id, teamId))
  );

  await Promise.all(updates);

  // Get updated teams
  const updatedTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.draftOrder);

  return NextResponse.json({
    success: true,
    message: "Draft order set successfully",
    data: {
      teams: updatedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        ownerId: team.ownerId,
        draftOrder: team.draftOrder,
      })),
    },
  });
}
