import { NextResponse } from "next/server";
import { syncClerkUserToDatabase } from "@/lib/userSync";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user data from Clerk
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Failed to get user data" },
        { status: 500 }
      );
    }

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

    const userData = await syncClerkUserToDatabase(clerkUser);
    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
