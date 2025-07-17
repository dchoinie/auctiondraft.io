import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserAdminStatusForLeague } from "@/lib/userSync";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get("leagueId");

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
      });
    }

    if (!leagueId) {
      return NextResponse.json({
        success: false,
        error: "League ID is required",
      });
    }

    // Check if user is admin of the specific league
    const isAdmin = await getCurrentUserAdminStatusForLeague(leagueId);

    return NextResponse.json({
      success: true,
      isAdmin: isAdmin,
      leagueId: leagueId,
      userId: userId,
    });
  } catch (error) {
    console.error("Error checking league admin status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check league admin status",
      },
      { status: 500 }
    );
  }
}
