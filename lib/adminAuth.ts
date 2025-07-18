import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export interface AdminAuthResult {
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Check if the current user is an admin using Clerk private metadata
 */
export async function checkAdminAuth(): Promise<AdminAuthResult> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        isAdmin: false,
        userId: null,
        error: "Not authenticated",
      };
    }

    // Get user from Clerk with private metadata
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const isAdmin = user.privateMetadata?.isAdmin === true;

    return {
      isAdmin,
      userId,
    };
  } catch (error) {
    console.error("Error checking admin auth:", error);
    return {
      isAdmin: false,
      userId: null,
      error: "Authentication error",
    };
  }
}

/**
 * Require admin privileges for an API route
 * Returns NextResponse with error if not admin, null if admin
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { isAdmin, error } = await checkAdminAuth();

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Admin privileges required" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if any admins exist in the system
 */
export async function hasAnyAdmins(): Promise<boolean> {
  try {
    // Query users with admin metadata
    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      limit: 1, // We only need to know if ANY exist
    });

    // Check if any user has admin metadata
    for (const user of users.data) {
      if (user.privateMetadata?.isAdmin === true) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking for existing admins:", error);
    return false;
  }
}

/**
 * Grant admin privileges to a user using Clerk private metadata
 */
export async function makeUserAdmin(userId: string): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, {
      privateMetadata: {
        isAdmin: true,
      },
    });

    console.log(`✅ User ${userId} granted admin privileges`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to grant admin privileges to user ${userId}:`,
      error
    );
    return false;
  }
}

/**
 * Remove admin privileges from a user
 */
export async function removeAdminPrivileges(userId: string): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, {
      privateMetadata: {
        isAdmin: false,
      },
    });

    console.log(`✅ Admin privileges removed from user ${userId}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to remove admin privileges from user ${userId}:`,
      error
    );
    return false;
  }
}
