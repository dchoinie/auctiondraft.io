import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserFromDatabase, syncClerkUserToDatabase } from "@/lib/userSync";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "Failed to get user data" },
        { status: 500 }
      );
    }

    // Get user from database
    let dbUser = await getUserFromDatabase(userId);

    // If user doesn't exist in database, sync them using the same logic as /api/sync-user
    if (!dbUser) {
      console.log("🔄 User not found in database, syncing...");
      try {
        // Use the same logic as /api/sync-user endpoint
        const clerkUserData = {
          id: userId,
          email_addresses: clerkUser.emailAddresses?.map((email) => ({
            email_address: email.emailAddress,
          })) || [],
          first_name: clerkUser.firstName || null,
          last_name: clerkUser.lastName || null,
        };
        
        await syncClerkUserToDatabase(clerkUserData);
        console.log("✅ User synced successfully");
        
        // Fetch the user again after sync
        dbUser = await getUserFromDatabase(userId);
      } catch (syncError) {
        console.error("❌ Error syncing user:", syncError);
        // Continue without database user data
      }
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        leagueCredits: dbUser?.leagueCredits || 0,
        stripeCustomerId: dbUser?.stripeCustomerId,
        stripeSubscriptionId: dbUser?.stripeSubscriptionId,
        isAdmin: false, // Default to false
        createdAt: dbUser?.createdAt?.toISOString(),
        updatedAt: dbUser?.updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in /api/user/current:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
