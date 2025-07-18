import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { makeUserAdmin, hasAnyAdmins, requireAdmin } from "@/lib/adminAuth";

/**
 * CONTROLLED ADMIN SETUP ENDPOINT
 *
 * Security rules:
 * 1. If no admins exist: Any authenticated user can make themselves admin (first-time setup)
 * 2. If admins exist: Only existing admins can grant admin privileges to others
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if any admins exist in the system
    const adminExists = await hasAnyAdmins();

    if (adminExists) {
      // If admins exist, require admin privileges to grant admin to others
      const adminError = await requireAdmin();
      if (adminError) {
        return adminError;
      }
    }

    // Get user ID from request body or use current user
    const body = await req.json();
    const targetUserId = body.userId || userId;

    console.log(
      `Making user ${targetUserId} an admin... (First admin: ${!adminExists})`
    );

    const success = await makeUserAdmin(targetUserId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "User granted admin privileges",
        userId: targetUserId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to grant admin privileges" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in make-admin endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
