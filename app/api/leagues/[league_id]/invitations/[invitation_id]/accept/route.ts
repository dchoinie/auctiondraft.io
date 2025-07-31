import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, teams, leagueInvitations, userProfiles } from "@/app/schema";
import { eq, and, ne } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ league_id: string; invitation_id: string }>;
  }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { league_id: leagueId, invitation_id: invitationId } = resolvedParams;
    const body = await req.json();
    const { teamName, firstName, lastName } = body;

    if (
      !teamName ||
      typeof teamName !== "string" ||
      teamName.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Team name is required" },
        { status: 400 }
      );
    }
    if (
      !firstName ||
      typeof firstName !== "string" ||
      firstName.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "First name is required" },
        { status: 400 }
      );
    }
    if (
      !lastName ||
      typeof lastName !== "string" ||
      lastName.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Last name is required" },
        { status: 400 }
      );
    }

    // Get user's email to verify invitation
    const user = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get and validate invitation
    const invitation = await db
      .select()
      .from(leagueInvitations)
      .where(
        and(
          eq(leagueInvitations.id, invitationId),
          eq(leagueInvitations.leagueId, leagueId),
          eq(leagueInvitations.email, user[0].email?.toLowerCase() || "")
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation not found or not for your email address",
        },
        { status: 404 }
      );
    }

    if (invitation[0].status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Invitation has already been ${invitation[0].status}`,
        },
        { status: 400 }
      );
    }

    // Get league details
    const league = await db
      .select()
      .from(leagues)
      .where(and(eq(leagues.id, leagueId), ne(leagues.status, "deleted")))
      .limit(1);

    if (league.length === 0) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    // Check if league is full
    const existingTeams = await db
      .select({ count: teams.id })
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    if (existingTeams.length >= (league[0].leagueSize || 10)) {
      return NextResponse.json(
        { success: false, error: "League is full" },
        { status: 400 }
      );
    }

    // Check if user already has a team in this league
    const existingTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, userId)))
      .limit(1);

    if (existingTeam.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have a team in this league",
        },
        { status: 400 }
      );
    }

    // Start transaction to create team and update invitation
    try {
      // Update user's first and last name in userProfiles
      await db
        .update(userProfiles)
        .set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
        .where(eq(userProfiles.id, userId));
      // Create the team
      const newTeam = await db
        .insert(teams)
        .values({
          name: teamName.trim(),
          ownerId: userId,
          leagueId: leagueId,
          budget: league[0].startingBudget || 200,
        })
        .returning();

      // Update invitation status
      await db
        .update(leagueInvitations)
        .set({
          status: "accepted",
        })
        .where(eq(leagueInvitations.id, invitationId));

      return NextResponse.json({
        success: true,
        team: {
          ...newTeam[0],
          ownerFirstName: user[0].firstName,
          ownerLastName: user[0].lastName,
          ownerEmail: user[0].email,
        },
        league: {
          id: league[0].id,
          name: league[0].name,
        },
        message: "Successfully joined league!",
      });
    } catch (dbError) {
      console.error("Database transaction error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to create team" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
