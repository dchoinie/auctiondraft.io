import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import { userProfiles, leagues } from "@/app/schema";
import { eq, sql } from "drizzle-orm";

export async function syncUserToDatabase() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Get user data from Clerk
  const user = await currentUser();

  if (!user) {
    throw new Error("User data not found");
  }

  // Check if user already exists in database
  const existingUser = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  console.log("🔍 Checking for existing user:", userId);
  console.log("📋 Existing user result:", existingUser);

  // Double-check with direct SQL query
  const directCheck = await db.execute(
    sql`SELECT id FROM user_profiles WHERE id = ${userId}`
  );
  console.log("🔍 Direct SQL check result:", directCheck);

  const userData = {
    id: userId,
    email: user.emailAddresses[0]?.emailAddress || "",
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    updatedAt: new Date(),
  };

  try {
    if (existingUser.length === 0) {
      // Create new user
      console.log("➕ Creating new user");
      await db.insert(userProfiles).values({
        ...userData,
        createdAt: new Date(),
      });
    } else {
      // Update existing user
      console.log("🔄 Updating existing user");
      await db
        .update(userProfiles)
        .set(userData)
        .where(eq(userProfiles.id, userId));
    }
  } catch (error) {
    // If insert fails due to duplicate key, try update instead
    if (error instanceof Error && error.message.includes("duplicate key")) {
      console.log(
        "🔄 Insert failed due to duplicate key, trying update instead"
      );
      await db
        .update(userProfiles)
        .set(userData)
        .where(eq(userProfiles.id, userId));
    } else {
      console.error("❌ Database error:", error);
      throw error;
    }
  }

  return userData;
}

export async function getUserFromDatabase(userId: string) {
  const user = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  return user[0] || null;
}

export async function isUserAdminOfLeague(
  userId: string,
  leagueId: string
): Promise<boolean> {
  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (league.length === 0) {
    return false;
  }

  return league[0].ownerId === userId;
}

export async function getCurrentUserAdminStatusForLeague(
  leagueId: string
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  return await isUserAdminOfLeague(userId, leagueId);
}
