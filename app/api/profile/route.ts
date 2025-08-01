import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserFromDatabase } from "@/lib/userSync";
import { db } from "@/lib/db";
import { userProfiles } from "@/app/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const user = await getUserFromDatabase(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { firstName, lastName } = await req.json();

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          error: "First name and last name are required",
        },
        { status: 400 }
      );
    }

    // Check if user exists in database
    const existingUser = await getUserFromDatabase(userId);

    if (existingUser) {
      // Update existing user
      await db
        .update(userProfiles)
        .set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, userId));
    } else {
      // Create new user if they don't exist
      console.log("🔄 Creating new user in profile update");
      await db.insert(userProfiles).values({
        id: userId,
        email: "", // Will be updated by sync later
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
