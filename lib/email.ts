import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not configured");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "info@auctiondraft.io";
const APP_NAME = "AuctionDraft.io";

export interface LeagueInvitationEmailData {
  invitationId: string;
  leagueId: string;
  joinCode: string | null;
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

  try {
    const result = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      subject: `You're invited to join "${data.leagueName}" fantasy league!`,
      html: createLeagueInvitationEmailTemplate(data, invitationUrl),
    });

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
      color: #fff;
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
    .alt-join {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 18px;
      margin: 30px 0 10px 0;
      border: 1px solid #e1e5e9;
    }
    .alt-join-title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .alt-join-label {
      font-weight: bold;
      color: #1f2937;
    }
    .alt-join-code {
      font-family: monospace;
      background: #e0e7ef;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 4px;
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
      <strong>${data.inviterName}</strong> has invited you to join their fantasy football league!
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

    <div class="alt-join">
      <div class="alt-join-title">Alternative Way to Join</div>
      <p style="margin-bottom: 8px;">If you prefer, you can join manually:</p>
      <ol style="margin-left: 18px;">
        <li><span>Create an account at <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" class="link">AuctionDraft.io</a></span></li>
        <li><span>Navigate to <span class="alt-join-label">/join</span> from the main menu</span></li>
        <li><span>Enter the following information:</span>
          <ul style="margin-top: 6px;">
            <li><span class="alt-join-label">League ID:</span> <span class="alt-join-code">${data.leagueId}</span></li>
            <li><span class="alt-join-label">Join Code:</span> <span class="alt-join-code">${data.joinCode || "(none)"}</span></li>
          </ul>
        </li>
      </ol>
      <p style="margin-top: 8px;">Then follow the prompts to join the league and create your team.</p>
    </div>

    <div class="footer">
      <p>
        This invitation was sent to ${data.recipientEmail}
        <br>
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" class="link">${APP_NAME}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Shared Invitation interface for use across the app
export interface Invitation {
  id: string;
  leagueId: string;
  email: string;
  status: string;
  createdAt: string;
  leagueName: string;
  leagueSize: number;
  inviterFirstName: string | null;
  inviterLastName: string | null;
  inviterEmail: string | null;
}
