import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagues, leagueInvitations } from "@/app/schema";
import { eq, and, ne } from "drizzle-orm";

// DELETE: Cancel a pending invitation (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string; invitation_id: string }> }
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

    // Verify league exists and user is owner
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
        {
          success: false,
          error: "Not authorized to cancel invitations in this league",
        },
        { status: 403 }
      );
    }

    // Check if invitation exists and is pending
    const invitation = await db
      .select()
      .from(leagueInvitations)
      .where(
        and(
          eq(leagueInvitations.id, invitationId),
          eq(leagueInvitations.leagueId, leagueId)
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation[0].status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel invitation that has already been ${invitation[0].status}`,
        },
        { status: 400 }
      );
    }

    // Delete the invitation
    await db
      .delete(leagueInvitations)
      .where(eq(leagueInvitations.id, invitationId));

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
