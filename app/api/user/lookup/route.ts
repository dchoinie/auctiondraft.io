import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Look up user by email
    const user = await db
      .select({
        id: userProfiles.id,
        email: userProfiles.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
      })
      .from(userProfiles)
      .where(eq(userProfiles.email, email.toLowerCase().trim()))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found with this email address" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: user[0],
    });
  } catch (error) {
    console.error("Error looking up user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lookup user" },
      { status: 500 }
    );
  }
}
