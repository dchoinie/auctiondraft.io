import type * as Party from "partykit/server";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

// Types for team-level state
export type PlayerDrafted = {
  playerId: string;
  name: string;
  cost: number;
};

export type TeamDraftState = {
  teamId: string;
  startingBudget: number;
  totalRosterSpots: number;
  remainingBudget: number;
  remainingRosterSpots: number;
  playersDrafted: PlayerDrafted[];
  maxBid: number;
};

export type DraftRoomState = {
  draftStarted: boolean;
  currentNominatorTeamId: string | null;
  nominatedPlayer: {
    id: string;
    name: string;
    position: string;
    team: string;
  } | null;
  startingBidAmount: number;
  currentBid: {
    amount: number;
    teamId: string;
  } | null;
  bidTimer: number | null;
  bidTimerExpiresAt: number | null;
  auctionPhase: "idle" | "goingOnce" | "goingTwice" | "sold";
  nominationOrder: string[];
  currentNominationIndex: number;
  teams: Record<string, TeamDraftState>;
  // New: Track the last 10 bids
  bidHistory: Array<{
    amount: number;
    teamId: string;
    timestamp: string;
  }>;
};

class PartyRoom implements Party.Server {
  static async onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      if (!token) throw new Error("No token provided");
      const authRequest = new Request("http://localhost", {
        headers: { Authorization: token },
      });
      const { isAuthenticated, toAuth } =
        await clerkClient.authenticateRequest(authRequest);
      if (!isAuthenticated) throw new Error("Invalid token");
      const auth = toAuth();
      request.headers.set("X-User-ID", auth.userId);
      return request;
    } catch (e) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  state: DraftRoomState = {
    draftStarted: false,
    currentNominatorTeamId: null,
    nominatedPlayer: null,
    startingBidAmount: 0,
    currentBid: null,
    bidTimer: null,
    bidTimerExpiresAt: null,
    auctionPhase: "idle",
    nominationOrder: [],
    currentNominationIndex: 0,
    teams: {},
    bidHistory: [], // New: initialize as empty array
  };

  // Track connected user IDs (owner IDs)
  connectedUserIds = new Set<string>();

  constructor(readonly room: Party.Room) {}

  onRequest(request: Party.Request) {
    return new Response("PartyKit HTTP endpoint is running!", { status: 200 });
  }

  onConnect(conn: Party.Connection, { request }: Party.ConnectionContext) {
    const userId = request.headers.get("X-User-ID");
    if (userId) {
      this.connectedUserIds.add(userId);
      this.broadcastUserList();
    }

    conn.send(JSON.stringify({ type: "welcome", userId }));
    conn.send(JSON.stringify({ type: "init", data: this.state }));

    // Clean up on disconnect
    conn.addEventListener("close", () => {
      if (userId) {
        this.connectedUserIds.delete(userId);
        this.broadcastUserList();
      }
    });

    conn.addEventListener("message", (event) => {
      let rawData = event.data;
      if (rawData instanceof ArrayBuffer) {
        rawData = new TextDecoder().decode(rawData);
      }
      const message = JSON.parse(rawData as string);

      switch (message.type) {
        case "init":
          // Only allow init if the state is still the default/empty state
          if (
            !this.state.draftStarted &&
            !this.state.nominatedPlayer &&
            Object.keys(this.state.teams).length === 0
          ) {
            this.state = message.data;
            this.room.broadcast(
              JSON.stringify({ type: "stateUpdate", data: this.state })
            );
          }
          // Otherwise, ignore the client's init message
          break;
        case "startDraft":
          this.state = {
            ...this.state,
            draftStarted: true,
          };
          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        case "pauseDraft":
          this.state = {
            ...this.state,
            draftStarted: false,
          };
          this.room.broadcast(
            JSON.stringify({ type: "draftPaused", data: this.state })
          );
          break;
        case "nominatePlayer": {
          // message.data: { teamId, amount, player: { id, firstName, lastName, team, position } }
          const { teamId, amount, player } = message.data;
          this.state = {
            ...this.state,
            nominatedPlayer: {
              id: player.id,
              name: player.firstName + " " + player.lastName,
              team: player.team,
              position: player.position,
            },
            currentBid: {
              amount,
              teamId,
            },
            bidHistory: [], // Clear bid history on new nomination
            auctionPhase: "idle",
          };
          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        }
        case "bid": {
          // message.data: { teamId, amount }
          const { teamId, amount } = message.data;
          // Only allow if amount is higher than currentBid (or minBid)
          const minBid = this.state.currentBid?.amount
            ? this.state.currentBid.amount + 1
            : 1;
          if (amount < minBid) {
            // Ignore invalid bid
            break;
          }
          // Add to bidHistory (keep last 10)
          const newBid = {
            amount,
            teamId,
            timestamp: new Date().toISOString(),
          };
          const newBidHistory = [...this.state.bidHistory, newBid].slice(-10);
          this.state = {
            ...this.state,
            currentBid: { amount, teamId },
            bidHistory: newBidHistory,
          };
          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        }
        default:
          conn.send(JSON.stringify({ echo: message }));
          break;
      }
    });
  }

  broadcastUserList() {
    this.room.broadcast(
      JSON.stringify({
        type: "connectedUsers",
        userIds: Array.from(this.connectedUserIds),
      })
    );
  }
}

export default PartyRoom;
