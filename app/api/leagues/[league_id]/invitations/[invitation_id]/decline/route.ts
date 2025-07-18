import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leagueInvitations, userProfiles } from "@/app/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: { league_id: string; invitation_id: string };
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

    // Update invitation status to declined
    await db
      .update(leagueInvitations)
      .set({
        status: "declined",
      })
      .where(eq(leagueInvitations.id, invitationId));

    return NextResponse.json({
      success: true,
      message: "Invitation declined successfully",
    });
  } catch (error) {
    console.error("Error declining invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to decline invitation" },
      { status: 500 }
    );
  }
}
