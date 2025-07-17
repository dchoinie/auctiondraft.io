import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserFromDatabase } from "@/lib/userSync";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ exists: false, error: "Not authenticated" });
    }

    // Check if user exists in database
    const user = await getUserFromDatabase(userId);

    return NextResponse.json({
      exists: !!user,
      userId: userId,
    });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { exists: false, error: "Failed to check user" },
      { status: 500 }
    );
  }
}
