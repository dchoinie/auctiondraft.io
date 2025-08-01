import { db, withRetry } from "./db";
import { userProfiles } from "@/app/schema";
import { eq } from "drizzle-orm";

// Clerk webhook user type (minimal for our use)
type ClerkWebhookUser = {
  id: string;
  email_addresses?: { email_address: string }[];
  first_name?: string | null;
  last_name?: string | null;
};

// Accepts Clerk user data from webhook and syncs to user_profiles
export async function syncClerkUserToDatabase(clerkUser: ClerkWebhookUser) {
  console.log("🔄 Starting user sync for:", clerkUser.id);
  
  const userId = clerkUser.id;
  if (!userId) {
    const error = "Clerk user missing id";
    console.error("❌", error);
    throw new Error(error);
  }

  const email = clerkUser.email_addresses?.[0]?.email_address || "";
  const firstName = clerkUser.first_name || null;
  const lastName = clerkUser.last_name || null;

  console.log("📝 Extracted user data:", {
    userId,
    email,
    firstName,
    lastName
  });

  return withRetry(async () => {
    console.log("🔍 Checking if user exists in database...");
    
    // Check if user already exists in database
    const existingUser = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    console.log("🔍 Existing user found:", existingUser.length > 0);

    const userData = {
      id: userId,
      email,
      firstName,
      lastName,
      updatedAt: new Date(),
    };

    try {
      if (existingUser.length === 0) {
        // Create new user
        console.log("➕ Creating new user in database...");
        await db.insert(userProfiles).values({
          ...userData,
          createdAt: new Date(),
        });
        console.log("✅ New user created successfully");
      } else {
        // Update existing user
        console.log("🔄 Updating existing user in database...");
        await db
          .update(userProfiles)
          .set(userData)
          .where(eq(userProfiles.id, userId));
        console.log("✅ Existing user updated successfully");
      }
    } catch (error) {
      console.error("❌ Database operation failed:", error);
      
      // If insert fails due to duplicate key, try update instead
      if (error instanceof Error && error.message.includes("duplicate key")) {
        console.log("🔄 Duplicate key detected, trying update instead...");
        await db
          .update(userProfiles)
          .set(userData)
          .where(eq(userProfiles.id, userId));
        console.log("✅ User updated after duplicate key error");
      } else {
        throw error;
      }
    }

    console.log("🎉 User sync completed successfully");
    return userData;
  });
}

export async function getUserFromDatabase(userId: string) {
  return withRetry(async () => {
    const user = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    return user[0] || null;
  });
}
