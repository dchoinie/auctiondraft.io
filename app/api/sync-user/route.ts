import { NextResponse } from "next/server";
import { syncUserToDatabase } from "@/lib/userSync";

export async function POST() {
  try {
    const userData = await syncUserToDatabase();
    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
