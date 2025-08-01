import { NextResponse } from "next/server";
import { syncClerkUserToDatabase } from "@/lib/userSync";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST() {
  try {
    console.log("🔄 Manual user sync requested");
    
    const { userId } = await auth();

    if (!userId) {
      console.log("❌ No authenticated user found");
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("👤 Authenticated user ID:", userId);

    // Get user data from Clerk
    const user = await currentUser();

    if (!user) {
      console.log("❌ Failed to get user data from Clerk");
      return NextResponse.json(
        { success: false, error: "Failed to get user data" },
        { status: 500 }
      );
    }

    console.log("📋 Clerk user data:", {
      id: user.id,
      emailAddresses: user.emailAddresses?.map(e => e.emailAddress),
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Extract user data from Clerk user object
    const clerkUser = {
      id: userId,
      email_addresses:
        user.emailAddresses?.map((email) => ({
          email_address: email.emailAddress,
        })) || [],
      first_name: user.firstName || null,
      last_name: user.lastName || null,
    };

    console.log("🔄 Calling syncClerkUserToDatabase...");
    const userData = await syncClerkUserToDatabase(clerkUser);
    
    console.log("✅ Manual sync completed successfully:", userData);
    
    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("❌ Error in manual user sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
