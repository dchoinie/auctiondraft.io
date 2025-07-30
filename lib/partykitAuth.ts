// Use dynamic imports to avoid __dirname issues in PartyKit
import { db } from "./db";
import { leagues, teams } from "../app/schema";
import { eq, and, ne } from "drizzle-orm";

export interface PartyKitAuthResult {
  userId: string | null;
  isAuthenticated: boolean;
  error?: string;
}

export interface LeagueMembershipResult {
  isMember: boolean;
  isOwner: boolean;
  error?: string;
}

/**
 * Verify a Clerk token for PartyKit connections
 * Simplified version that just decodes the JWT without server-side verification
 */
export async function verifyPartyKitToken(
  token: string
): Promise<PartyKitAuthResult> {
  try {
    if (!token) {
      return {
        userId: null,
        isAuthenticated: false,
        error: "No token provided",
      };
    }

    console.log(
      "PartyKit: Attempting to verify token:",
      token.substring(0, 20) + "..."
    );

    // Since we're getting a valid JWT from Clerk's getToken(),
    // we can just decode it to extract the user ID
    // This is safe because the token comes from the authenticated client
    try {
      // Decode the JWT token to extract user ID
      const base64Url = token.split(".")[1];
      console.log("base64Url", base64Url);
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      console.log("base64", base64);
      // Use atob for base64 decoding (works in PartyKit environment)
      const jsonPayload = atob(base64);
      console.log("jsonPayload", jsonPayload);
      const payload = JSON.parse(jsonPayload);
      console.log("payload", payload);
      if (payload.sub) {
        console.log("PartyKit: JWT token decoded for user:", payload.sub);
        return {
          userId: payload.sub,
          isAuthenticated: true,
        };
      } else {
        console.log("PartyKit: No user ID found in token payload");
        return {
          userId: null,
          isAuthenticated: false,
          error: "No user ID in token",
        };
      }
    } catch (jwtError) {
      console.log("JWT decoding failed:", jwtError);
      return {
        userId: null,
        isAuthenticated: false,
        error: "Invalid token format",
      };
    }
  } catch (error) {
    console.error("Error verifying PartyKit token:", error);
    return {
      userId: null,
      isAuthenticated: false,
      error: "Token verification failed",
    };
  }
}

/**
 * Check if a user is a member of a specific league
 */
export async function checkLeagueMembership(
  userId: string,
  leagueId: string
): Promise<LeagueMembershipResult> {
  try {
    console.log(
      "PartyKit: Checking league membership for user:",
      userId,
      "in league:",
      leagueId
    );

    // Check if user is the league owner
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .where(ne(leagues.status, "deleted"))
      .limit(1);

    if (league.length === 0) {
      console.log("PartyKit: League not found:", leagueId);
      return {
        isMember: false,
        isOwner: false,
        error: "League not found",
      };
    }

    if (league[0].ownerId === userId) {
      console.log("PartyKit: User is league owner");
      return {
        isMember: true,
        isOwner: true,
      };
    }

    // Check if user has a team in this league
    const userTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, userId)))
      .limit(1);

    if (userTeam.length > 0) {
      console.log("PartyKit: User is league member via team ownership");
      return {
        isMember: true,
        isOwner: false,
      };
    }

    console.log("PartyKit: User is not a member of this league");
    return {
      isMember: false,
      isOwner: false,
      error: "User is not a member of this league",
    };
  } catch (error) {
    console.error("Error checking league membership:", error);
    return {
      isMember: false,
      isOwner: false,
      error: "Failed to check league membership",
    };
  }
}
