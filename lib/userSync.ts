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
  const userId = clerkUser.id;
  if (!userId) throw new Error("Clerk user missing id");

  const email = clerkUser.email_addresses?.[0]?.email_address || "";
  const firstName = clerkUser.first_name || null;
  const lastName = clerkUser.last_name || null;

  return withRetry(async () => {
    // Check if user already exists in database
    const existingUser = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

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
        await db.insert(userProfiles).values({
          ...userData,
          createdAt: new Date(),
        });
      } else {
        // Update existing user
        await db
          .update(userProfiles)
          .set(userData)
          .where(eq(userProfiles.id, userId));
      }
    } catch (error) {
      // If insert fails due to duplicate key, try update instead
      if (error instanceof Error && error.message.includes("duplicate key")) {
        await db
          .update(userProfiles)
          .set(userData)
          .where(eq(userProfiles.id, userId));
      } else {
        throw error;
      }
    }

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
