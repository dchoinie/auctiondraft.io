import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, leagueInvitations, userProfiles } from "@/app/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { invitation_id: string } }
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
    const invitationId = resolvedParams.invitation_id;

    // Get user's email
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

    // Get invitation with league and inviter details
    const invitation = await db
      .select({
        id: leagueInvitations.id,
        leagueId: leagueInvitations.leagueId,
        email: leagueInvitations.email,
        status: leagueInvitations.status,
        createdAt: leagueInvitations.createdAt,
        leagueName: leagues.name,
        leagueSize: leagues.leagueSize,
        inviterFirstName: userProfiles.firstName,
        inviterLastName: userProfiles.lastName,
        inviterEmail: userProfiles.email,
      })
      .from(leagueInvitations)
      .leftJoin(leagues, eq(leagueInvitations.leagueId, leagues.id))
      .leftJoin(userProfiles, eq(leagueInvitations.invitedBy, userProfiles.id))
      .where(eq(leagueInvitations.id, invitationId))
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    // Verify invitation is for current user's email
    if (invitationData.email?.toLowerCase() !== user[0].email?.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation is not for your email address",
        },
        { status: 403 }
      );
    }

    // Check if invitation is still valid
    if (invitationData.status !== "pending") {
      return NextResponse.json({
        success: true,
        invitation: invitationData,
        canAccept: false,
        message: `This invitation has already been ${invitationData.status}`,
      });
    }

    // Check if league still exists
    if (!invitationData.leagueName) {
      return NextResponse.json({
        success: true,
        invitation: invitationData,
        canAccept: false,
        message: "The league for this invitation no longer exists",
      });
    }

    return NextResponse.json({
      success: true,
      invitation: invitationData,
      canAccept: true,
      currentUserEmail: user[0].email,
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
