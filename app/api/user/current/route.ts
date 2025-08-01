import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserFromDatabase } from "@/lib/userSync";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json(
        { error: "Failed to get user data" },
        { status: 500 }
      );
    }

    // Get user from database
    const dbUser = await getUserFromDatabase(userId);

    return NextResponse.json({
      id: userId,
      email: clerkUser.emailAddresses?.[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      // Include database user data if it exists
      leagueCredits: dbUser?.leagueCredits || 0,
      stripeCustomerId: dbUser?.stripeCustomerId,
      stripeSubscriptionId: dbUser?.stripeSubscriptionId,
      // Flag to indicate if user exists in database
      existsInDatabase: !!dbUser,
    });
  } catch (error) {
    console.error("Error in /api/user/current:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
