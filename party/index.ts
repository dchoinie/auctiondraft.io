import type * as Party from "partykit/server";
import { db } from "@/lib/db";
import { draftStateHistory, draftedPlayers, keepers } from "@/app/schema";
import { eq } from "drizzle-orm";

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
    console.log("PartyKit: onBeforeConnect called - NO AUTH");
    // Allow all connections without authentication
    return request;
  }

  static async onBeforeRequest(request: Party.Request) {
    console.log("PartyKit: onBeforeRequest called - NO AUTH");
    // Allow all HTTP requests without authentication
    return request;
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
    bidHistory: [],
  };
  hydrated = false;
  resetAllowed = false;

  // Track connected user IDs (owner IDs)
  connectedUserIds = new Set<string>();

  countdownTimeout: NodeJS.Timeout | null = null;
  countdownPhase: "goingOnce" | "goingTwice" | "sold" | null = null;

  startAuctionCountdown() {
    if (this.countdownTimeout) {
      console.log("Countdown already running, ignoring trigger.");
      return;
    }
    this.state = { ...this.state, auctionPhase: "goingOnce" };
    this.room.broadcast(
      JSON.stringify({ type: "stateUpdate", data: this.state })
    );
    this.countdownPhase = "goingOnce";
    console.log("Auction phase: goingOnce");

    this.countdownTimeout = setTimeout(() => {
      this.state = { ...this.state, auctionPhase: "goingTwice" };
      this.room.broadcast(
        JSON.stringify({ type: "stateUpdate", data: this.state })
      );
      this.countdownPhase = "goingTwice";
      console.log("Auction phase: goingTwice");

      this.countdownTimeout = setTimeout(async () => {
        this.state = { ...this.state, auctionPhase: "sold" };
        this.room.broadcast(
          JSON.stringify({ type: "stateUpdate", data: this.state })
        );
        this.countdownPhase = "sold";
        this.countdownTimeout = null;
        console.log("Auction phase: sold");
        await this.handleSoldPhase();
      }, 4000);
    }, 4000);
  }

  clearCountdown() {
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
      this.countdownPhase = null;
      console.log("Countdown cleared.");
    }
  }

  async handleSoldPhase() {
    // --- SOLD PHASE LOGIC ---
    console.log("PartyKit: Sold phase - skipping API call for testing");
    // Advance nomination
    const nextNominationIndex =
      (this.state.currentNominationIndex + 1) %
      (this.state.nominationOrder.length || 1);
    const nextNominatorTeamId =
      this.state.nominationOrder[nextNominationIndex] || null;
    this.state = {
      ...this.state,
      nominatedPlayer: null,
      currentBid: null,
      auctionPhase: "idle",
      currentNominationIndex: nextNominationIndex,
      currentNominatorTeamId: nextNominatorTeamId,
      bidHistory: [],
    };
    this.room.broadcast(
      JSON.stringify({ type: "stateUpdate", data: this.state })
    );
  }

  async hydrateStateFromDB() {
    const leagueId = this.room.id;
    const latest = await db.query.draftStateHistory.findFirst({
      where: (row, { eq }) => eq(row.leagueId, leagueId),
      orderBy: (row, { desc }) => desc(row.createdAt),
    });
    if (latest) {
      this.state = latest.draftState as DraftRoomState;
      this.hydrated = true;
      this.resetAllowed = false;
    } else {
      this.hydrated = false;
      this.resetAllowed = true;
    }
  }
  async saveSnapshot(eventType: string, eventData: unknown) {
    await db.insert(draftStateHistory).values({
      leagueId: this.room.id,
      draftState: this.state,
      eventType,
      eventData,
    });
  }

  constructor(readonly room: Party.Room) {}

  onRequest(request: Party.Request) {
    console.log("PartyKit: onRequest called for URL:", request.url);
    return new Response("PartyKit HTTP endpoint is running!", { status: 200 });
  }

  async onConnect(
    conn: Party.Connection,
    { request }: Party.ConnectionContext
  ) {
    console.log("PartyKit: onConnect called - NO AUTH");
    try {
      // Skip database hydration for now to test connection
      console.log("PartyKit: Skipping DB hydration for testing");
      this.hydrated = true;
      this.resetAllowed = true;

      // Generate a simple connection ID for tracking
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.connectedUserIds.add(connectionId);
      this.broadcastUserList();
      console.log("PartyKit: Connection added:", connectionId);

      console.log("PartyKit: Sending welcome message...");
      conn.send(JSON.stringify({ type: "welcome", connectionId }));
      console.log("PartyKit: Sending init message...");
      conn.send(JSON.stringify({ type: "init", data: this.state }));
      console.log("PartyKit: Connection established successfully");
    } catch (error) {
      console.error("PartyKit: Error in onConnect:", error);
    }

    // Clean up on disconnect
    conn.addEventListener("close", () => {
      const connectionId = Array.from(this.connectedUserIds).find((id) =>
        id.startsWith("conn_")
      );
      if (connectionId) {
        this.connectedUserIds.delete(connectionId);
        this.broadcastUserList();
        console.log("PartyKit: Connection removed:", connectionId);
      }
    });

    conn.addEventListener("message", async (event) => {
      let rawData = event.data;
      if (rawData instanceof ArrayBuffer) {
        rawData = new TextDecoder().decode(rawData);
      }
      const message = JSON.parse(rawData as string);

      switch (message.type) {
        case "init":
          if (this.resetAllowed) {
            this.state = { ...message.data, draftStarted: true };
            // Skip database save for testing
            this.resetAllowed = false;
            this.room.broadcast(
              JSON.stringify({ type: "stateUpdate", data: this.state })
            );
          }
          // Otherwise, ignore the client's init message
          break;
        case "resetDraft":
          // Skip database operations for testing
          console.log(
            "PartyKit: Reset draft requested (DB operations skipped)"
          );
          this.state = {
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
            bidHistory: [],
          };
          this.resetAllowed = true;
          // Skip database save for testing
          this.room.broadcast(JSON.stringify({ type: "draftReset" }));
          break;
        case "startDraft":
          this.state = {
            ...this.state,
            draftStarted: true,
          };
          // Skip database save for testing
          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        case "pauseDraft":
          this.state = {
            ...this.state,
            draftStarted: false,
          };
          // Skip database save for testing
          this.room.broadcast(
            JSON.stringify({ type: "draftPaused", data: this.state })
          );
          break;
        case "nominatePlayer": {
          // message.data: { teamId, amount, player: { id, firstName, lastName, team, position } }
          this.clearCountdown();
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
          // Skip database save for testing
          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        }
        case "triggerCountdown": {
          // Only allow if auctionPhase is idle and a player is nominated
          if (
            this.state.auctionPhase === "idle" &&
            this.state.nominatedPlayer
          ) {
            this.clearCountdown();
            this.startAuctionCountdown();
            // Skip database save for testing
          }
          break;
        }
        case "bid": {
          // Cancel countdown if a bid is placed
          this.clearCountdown();
          this.state = { ...this.state, auctionPhase: "idle" };
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
          // Skip database save for testing
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
