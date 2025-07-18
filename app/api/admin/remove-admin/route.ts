import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { removeAdminPrivileges, requireAdmin } from "@/lib/adminAuth";

/**
 * REMOVE ADMIN PRIVILEGES ENDPOINT
 *
 * Only existing admins can remove admin privileges from other users
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

    // Require admin privileges to remove admin from others
    const adminError = await requireAdmin();
    if (adminError) {
      return adminError;
    }

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Target user ID is required" },
        { status: 400 }
      );
    }

    // Prevent self-removal (optional safety check)
    if (targetUserId === userId) {
      return NextResponse.json(
        { success: false, error: "Cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    console.log(`Removing admin privileges from user ${targetUserId}...`);

    const success = await removeAdminPrivileges(targetUserId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Admin privileges removed",
        userId: targetUserId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to remove admin privileges" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in remove-admin endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
