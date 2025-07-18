import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not configured");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "info@auctiondraft.io";
const APP_NAME = "AuctionDraft.io";

export interface LeagueInvitationEmailData {
  invitationId: string;
  leagueName: string;
  inviterName: string;
  inviterEmail: string;
  leagueSize: number;
  currentTeams: number;
  recipientEmail: string;
}

export async function sendLeagueInvitationEmail(
  data: LeagueInvitationEmailData
) {
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invitations/${data.invitationId}`;

  console.log("Sending invitation email to:", data.recipientEmail);
  console.log("Invitation URL:", invitationUrl);
  console.log("From email:", FROM_EMAIL);
  console.log("Resend API key configured:", !!process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      subject: `You're invited to join "${data.leagueName}" fantasy league!`,
      html: createLeagueInvitationEmailTemplate(data, invitationUrl),
    });

    console.log("Email sent successfully:", result);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("Error sending email:", error);

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return {
          success: false,
          error: "Email service not configured correctly",
        };
      }
      if (error.message.includes("domain")) {
        return { success: false, error: "Email domain not verified" };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

function createLeagueInvitationEmailTemplate(
  data: LeagueInvitationEmailData,
  invitationUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>League Invitation - ${data.leagueName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e1e5e9;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .league-name {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
      margin: 20px 0;
    }
    .invitation-text {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .stats {
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .stats-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 5px 0;
      border-bottom: 1px solid #e1e5e9;
    }
    .stats-item:last-child {
      border-bottom: none;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      text-align: center;
      margin: 20px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e1e5e9;
      color: #6b7280;
      font-size: 14px;
    }
    .link {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${APP_NAME}</div>
      <p>Fantasy Football League Invitation</p>
    </div>
    
    <h1 class="league-name">🏆 ${data.leagueName}</h1>
    
    <p class="invitation-text">
      <strong>${
        data.inviterName
      }</strong> has invited you to join their fantasy football league!
    </p>
    
    <div class="stats">
      <div class="stats-item">
        <span><strong>League:</strong></span>
        <span>${data.leagueName}</span>
      </div>
      <div class="stats-item">
        <span><strong>Invited by:</strong></span>
        <span>${data.inviterName} (${data.inviterEmail})</span>
      </div>
      <div class="stats-item">
        <span><strong>League Size:</strong></span>
        <span>${data.leagueSize} teams</span>
      </div>
      <div class="stats-item">
        <span><strong>Current Teams:</strong></span>
        <span>${data.currentTeams} / ${data.leagueSize}</span>
      </div>
      <div class="stats-item">
        <span><strong>Spots Remaining:</strong></span>
        <span>${data.leagueSize - data.currentTeams}</span>
      </div>
    </div>
    
    <div class="cta-container">
      <a href="${invitationUrl}" class="cta-button">Accept Invitation & Join League</a>
    </div>
    
    <p class="invitation-text">
      Click the button above to accept the invitation and create your team. You'll be able to set your team name and join the league immediately.
    </p>
    
    <p class="invitation-text">
      If you can't click the button, copy and paste this link into your browser:
      <br><a href="${invitationUrl}" class="link">${invitationUrl}</a>
    </p>
    
    <div class="footer">
      <p>
        This invitation was sent to ${data.recipientEmail}
        <br>
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      <p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }" class="link">${APP_NAME}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
