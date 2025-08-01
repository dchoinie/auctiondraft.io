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
        
        if (!dbUser) {
          console.error("❌ User still not found after sync attempt");
          throw new Error("Failed to sync user to database");
        }
      } catch (syncError) {
        console.error("❌ Error syncing user:", syncError);
        return NextResponse.json(
          { success: false, error: "Failed to sync user to database" },
          { status: 500 }
        );
      }
    }

    // Return user data from database (not from Clerk)
    const userData = {
      id: userId,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      leagueCredits: dbUser.leagueCredits || 0,
      stripeCustomerId: dbUser.stripeCustomerId,
      stripeSubscriptionId: dbUser.stripeSubscriptionId,
      isAdmin: false, // Default to false
      createdAt: dbUser.createdAt?.toISOString(),
      updatedAt: dbUser.updatedAt?.toISOString(),
    };

    console.log("📋 Returning user data from database:", {
      userId,
      dbUserExists: !!dbUser,
      dbFirstName: dbUser.firstName,
      dbLastName: dbUser.lastName,
      clerkFirstName: clerkUser.firstName,
      clerkLastName: clerkUser.lastName,
      finalFirstName: userData.firstName,
      finalLastName: userData.lastName,
    });

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error in /api/user/current:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
