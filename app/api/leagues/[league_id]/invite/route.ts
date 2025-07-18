import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, leagueInvitations, teams, userProfiles } from "@/app/schema";
import { eq, and } from "drizzle-orm";
import { sendLeagueInvitationEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const leagueId = params.league_id;
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

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
        {
          success: false,
          error: "Not authorized to invite users to this league",
        },
        { status: 403 }
      );
    }

    // Get inviter information
    const inviter = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (inviter.length === 0) {
      return NextResponse.json(
        { success: false, error: "Inviter profile not found" },
        { status: 404 }
      );
    }

    // Check if invitation already exists
    const existingInvite = await db
      .select()
      .from(leagueInvitations)
      .where(
        and(
          eq(leagueInvitations.leagueId, leagueId),
          eq(leagueInvitations.email, email.toLowerCase()),
          eq(leagueInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite.length > 0) {
      return NextResponse.json(
        { success: false, error: "Invitation already sent to this email" },
        { status: 400 }
      );
    }

    // Get current team count
    const currentTeams = await db
      .select({ count: teams.id })
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    // Create invitation
    const newInvitation = await db
      .insert(leagueInvitations)
      .values({
        leagueId: leagueId,
        email: email.toLowerCase(),
        invitedBy: userId,
        status: "pending",
      })
      .returning();

    // Send email invitation
    try {
      const emailResult = await sendLeagueInvitationEmail({
        invitationId: newInvitation[0].id,
        leagueName: league[0].name,
        inviterName: `${inviter[0].firstName || ""} ${inviter[0].lastName || ""}`.trim() || "League Admin",
        inviterEmail: inviter[0].email,
        leagueSize: league[0].leagueSize || 10,
        currentTeams: currentTeams.length,
        recipientEmail: email.toLowerCase(),
      });

      if (!emailResult.success) {
        console.error("Email sending failed:", emailResult.error);
        // Don't fail the API call, just log the error
        // The invitation is still created in the database
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the API call, just log the error
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitation: newInvitation[0],
    });
  } catch (error) {
    console.error("Error sending league invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}

// Get pending invitations for a league
export async function GET(
  req: NextRequest,
  { params }: { params: { league_id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const leagueId = params.league_id;

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
        {
          success: false,
          error: "Not authorized to view invitations for this league",
        },
        { status: 403 }
      );
    }

    // Get pending invitations
    const invitations = await db
      .select()
      .from(leagueInvitations)
      .where(eq(leagueInvitations.leagueId, leagueId));

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error("Error fetching league invitations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
