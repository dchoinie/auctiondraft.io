import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { getUserFromDatabase } from "@/lib/userSync";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    console.log("🔍 Debug user sync endpoint called");
    
    // Check database health
    console.log("🏥 Checking database health...");
    const dbHealth = await checkDatabaseHealth();
    console.log("🏥 Database health:", dbHealth);

    // Get current user info
    const { userId } = await auth();
    const user = await currentUser();
    
    console.log("👤 Current user info:", {
      userId,
      hasUser: !!user,
      email: user?.emailAddresses?.[0]?.emailAddress
    });

    // Check if user exists in database
    let dbUser = null;
    if (userId) {
      console.log("🔍 Checking if user exists in database...");
      dbUser = await getUserFromDatabase(userId);
      console.log("🔍 User in database:", dbUser);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealth.healthy,
        error: dbHealth.error
      },
      clerk: {
        userId,
        hasUser: !!user,
        email: user?.emailAddresses?.[0]?.emailAddress,
        firstName: user?.firstName,
        lastName: user?.lastName
      },
      databaseUser: {
        userExists: !!dbUser,
        user: dbUser
      }
    });
  } catch (error) {
    console.error("❌ Error in debug endpoint:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 