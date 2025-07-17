import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserFromDatabase } from "@/lib/userSync";

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

    const user = await getUserFromDatabase(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stripeCustomerId: user.stripeCustomerId,
      credits: user.leagueCredits || 0,
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}
