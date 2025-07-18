import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendLeagueInvitationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Send test email
    const emailResult = await sendLeagueInvitationEmail({
      invitationId: "test-invitation-id",
      leagueName: "Test League",
      inviterName: "Test Admin",
      inviterEmail: "test@example.com",
      leagueSize: 10,
      currentTeams: 3,
      recipientEmail: email,
    });

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        messageId: emailResult.messageId,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error,
      });
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

// Only allow in development
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json({
    message: "Test email endpoint - use POST with { email: 'test@example.com' }",
  });
} 