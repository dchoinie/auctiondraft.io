import type * as Party from "partykit/server";
import { verifyPartyKitToken } from "../lib/partykitAuth";

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
  draftPaused: boolean; // Track if draft is paused
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
  draftType: "snake" | "linear"; // Add draft type to state
  timerDuration: number; // Timer duration in seconds
  autoStartTimer: boolean; // Auto-start countdown on nomination
  currentRound: number; // Current round number
  currentPick: number; // Current pick number within the round
  totalPicks: number; // Total picks made so far
  teams: Record<string, TeamDraftState>;
  // New: Track the last 10 bids
  bidHistory: Array<{
    amount: number;
    teamId: string;
    timestamp: string;
  }>;
};

class PartyRoom implements Party.Server {
  state: DraftRoomState = {
    draftStarted: false,
    draftPaused: false, // Not paused initially
    currentNominatorTeamId: null,
    nominatedPlayer: null,
    startingBidAmount: 0,
    currentBid: null,
    bidTimer: null,
    bidTimerExpiresAt: null,
    auctionPhase: "idle",
    nominationOrder: [],
    currentNominationIndex: 0,
    draftType: "linear", // Default to linear
    timerDuration: 4, // Default timer duration
    autoStartTimer: false, // Default to manual start
    currentRound: 1, // Start at round 1
    currentPick: 1, // Start at pick 1
    totalPicks: 0, // No picks made yet
    teams: {},
    bidHistory: [],
  };
  resetAllowed = true; // Allow reset by default since we're not hydrating from DB

  // Track connected user IDs (owner IDs)
  connectedUserIds = new Set<string>();

  // Track authenticated users and their roles
  authenticatedUsers = new Map<string, { userId: string; isOwner: boolean }>();

  // Track connection objects to their IDs
  connectionToId = new WeakMap<Party.Connection, string>();

  countdownTimeout: NodeJS.Timeout | null = null;
  countdownPhase: "goingOnce" | "goingTwice" | "sold" | null = null;

  startAuctionCountdown() {
    if (this.countdownTimeout) {
      return;
    }

    // Get timer duration from league settings (default to 4 seconds if not set)
    const timerDuration = this.state.timerDuration || 4;

    this.state = { ...this.state, auctionPhase: "goingOnce" };
    this.room.broadcast(
      JSON.stringify({ type: "stateUpdate", data: this.state })
    );
    this.countdownPhase = "goingOnce";

    this.countdownTimeout = setTimeout(() => {
      this.state = { ...this.state, auctionPhase: "goingTwice" };
      this.room.broadcast(
        JSON.stringify({ type: "stateUpdate", data: this.state })
      );
      this.countdownPhase = "goingTwice";

      this.countdownTimeout = setTimeout(async () => {
        this.state = { ...this.state, auctionPhase: "sold" };
        this.room.broadcast(
          JSON.stringify({ type: "stateUpdate", data: this.state })
        );
        this.countdownPhase = "sold";
        this.countdownTimeout = null;
        await this.handleSoldPhase();
      }, timerDuration * 1000);
    }, timerDuration * 1000);
  }

  clearCountdown() {
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
      this.countdownPhase = null;
    }
  }

  async handleSoldPhase() {
    // --- SOLD PHASE LOGIC ---

    // Capture player data before clearing it
    const soldPlayer = this.state.nominatedPlayer;
    const winningBid = this.state.currentBid;

    // Update team state in memory if there's a nominated player and winning bid
    if (soldPlayer && winningBid) {
      this.updateTeamAfterAcquisition(winningBid.teamId, winningBid.amount);
    }

    // Calculate next nomination based on draft type
    let nextNominationIndex: number;
    const totalTeams = this.state.nominationOrder.length;

    if (this.state.draftType === "snake") {
      // Snake draft: reverse direction every round
      const currentRound = Math.floor(
        this.state.currentNominationIndex / totalTeams
      );
      const isReverseRound = currentRound % 2 === 1; // Odd rounds (1, 3, 5...) go in reverse

      if (isReverseRound) {
        // Going backwards in this round
        nextNominationIndex = this.state.currentNominationIndex - 1;
        if (nextNominationIndex < 0) {
          // End of reverse round, start next round going forward
          nextNominationIndex = 0;
        }
      } else {
        // Going forwards in this round
        nextNominationIndex = this.state.currentNominationIndex + 1;
        if (nextNominationIndex >= totalTeams) {
          // End of forward round, start next round going backward
          nextNominationIndex = totalTeams - 1;
        }
      }
    } else {
      // Linear draft: always go to next team in order
      nextNominationIndex =
        (this.state.currentNominationIndex + 1) % totalTeams;
    }

    const nextNominatorTeamId =
      this.state.nominationOrder[nextNominationIndex] || null;

    // Update round and pick counters
    const newTotalPicks = this.state.totalPicks + 1;
    const newRound = Math.floor(newTotalPicks / totalTeams) + 1;
    const newPick = (newTotalPicks % totalTeams) + 1;

    this.state = {
      ...this.state,
      nominatedPlayer: null,
      currentBid: null,
      auctionPhase: "idle",
      currentNominationIndex: nextNominationIndex,
      currentNominatorTeamId: nextNominatorTeamId,
      currentRound: newRound,
      currentPick: newPick,
      totalPicks: newTotalPicks,
      bidHistory: [],
    };

    this.room.broadcast(
      JSON.stringify({ type: "stateUpdate", data: this.state })
    );
  }

  updateTeamAfterAcquisition(teamId: string, price: number) {
    const teamState = this.state.teams[teamId];
    if (teamState) {
      // Validate that team has enough budget
      if (teamState.remainingBudget < price) {
        console.error(
          `Team ${teamId} doesn't have enough budget for player at $${price}`
        );
        return;
      }

      // Update remaining budget
      teamState.remainingBudget -= price;

      // Update remaining roster spots
      teamState.remainingRosterSpots -= 1;

      // Update max bid (remaining budget - remaining spots + 1)
      teamState.maxBid = Math.max(
        1,
        teamState.remainingBudget - (teamState.remainingRosterSpots - 1)
      );

      // Add player to team's drafted players list
      const player = this.state.nominatedPlayer;
      if (player) {
        teamState.playersDrafted.push({
          playerId: player.id,
          name: player.name,
          cost: price,
        });
      }
    }
  }

  validateTeamBudget(teamId: string, bidAmount: number): boolean {
    const teamState = this.state.teams[teamId];
    if (!teamState) return false;

    // Check if team has enough budget for this bid
    if (teamState.remainingBudget < bidAmount) return false;

    // Check if team has enough roster spots
    if (teamState.remainingRosterSpots <= 0) return false;

    // Check if bid exceeds maxBid (which accounts for remaining roster spots)
    if (bidAmount > teamState.maxBid) return false;

    return true;
  }

  // Database operations moved to client side - no longer needed in PartyKit server

  constructor(readonly room: Party.Room) {}

  onRequest(request: Party.Request) {
    return new Response("PartyKit HTTP endpoint is running!", { status: 200 });
  }

  async onConnect(
    conn: Party.Connection,
    { request }: Party.ConnectionContext
  ) {
    console.log("PartyKit: New connection attempt");

    try {
      // Extract token from query parameters
      const url = new URL(request.url);
      const token = url.searchParams.get("token");

      if (!token) {
        console.log("PartyKit: No token provided");
        conn.send(
          JSON.stringify({ type: "authError", error: "No token provided" })
        );
        conn.close();
        return;
      }

      // Verify the token
      const authResult = await verifyPartyKitToken(token);

      if (!authResult.isAuthenticated) {
        console.log("PartyKit: Authentication failed:", authResult.error);
        conn.send(
          JSON.stringify({
            type: "authError",
            error: authResult.error || "Authentication failed",
          })
        );
        conn.close();
        return;
      }

      console.log("PartyKit: User authenticated:", authResult.userId);

      // League membership check removed - all authenticated users can join
      const isOwner = false; // Default to false for now

      // Generate connection ID and store user info
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.connectedUserIds.add(connectionId);
      this.authenticatedUsers.set(connectionId, {
        userId: authResult.userId!,
        isOwner: isOwner,
      });
      this.connectionToId.set(conn, connectionId);

      // Send welcome message
      conn.send(JSON.stringify({ type: "welcome", connectionId }));

      // Send initial state
      conn.send(JSON.stringify({ type: "init", data: this.state }));
      this.broadcastUserList();
    } catch (error) {
      console.error("PartyKit: Error in onConnect:", error);
      conn.send(
        JSON.stringify({ type: "authError", error: "Connection error" })
      );
      conn.close();
    }

    // try {
    //   // Generate a simple connection ID for tracking
    //   const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    //   this.connectedUserIds.add(connectionId);

    //   // Send welcome message immediately
    //   conn.send(JSON.stringify({ type: "welcome", connectionId }));

    //   // Try database hydration in background, don't block connection
    //   this.hydrateStateFromDB().catch((error) => {
    //     console.error("PartyKit: Error in hydrateStateFromDB:", error);
    //     // Continue with default state if database hydration fails
    //   }).finally(() => {
    //     // Send initial state after hydration attempt (success or failure)
    //     try {
    //       conn.send(JSON.stringify({ type: "init", data: this.state }));
    //       this.broadcastUserList();
    //     } catch (error) {
    //       console.error("PartyKit: Error sending init data:", error);
    //     }
    //   });

    // } catch (error) {
    //   console.error("PartyKit: Error in onConnect:", error);
    //   // Don't let connection errors break the connection
    // }

    // Clean up on disconnect
    conn.addEventListener("close", () => {
      const connectionId = this.connectionToId.get(conn);
      if (connectionId) {
        this.connectedUserIds.delete(connectionId);
        this.authenticatedUsers.delete(connectionId);
        this.connectionToId.delete(conn);
        this.broadcastUserList();
      }
    });

    conn.addEventListener("message", async (event) => {
      let rawData = event.data;
      if (rawData instanceof ArrayBuffer) {
        rawData = new TextDecoder().decode(rawData);
      }
      const message = JSON.parse(rawData as string);

      // Get connection ID for authorization checks
      const connectionId = this.connectionToId.get(conn);

      switch (message.type) {
        case "init":
          // Check if user is authorized (league owner)
          if (!connectionId || !this.isUserAuthorized(connectionId)) {
            console.log("PartyKit: Unauthorized init attempt");
            break;
          }

          if (this.resetAllowed) {
            this.state = { ...message.data, draftStarted: true };

            // Database operations handled by client

            this.resetAllowed = false;
            this.room.broadcast(
              JSON.stringify({ type: "stateUpdate", data: this.state })
            );
          }
          // Otherwise, ignore the client's init message
          break;
        case "resetDraft":
          // Check if user is authorized (league owner)
          if (!connectionId || !this.isUserAuthorized(connectionId)) {
            console.log("PartyKit: Unauthorized resetDraft attempt");
            break;
          }

          // Database operations handled by client

          this.state = {
            draftStarted: false,
            draftPaused: false, // Not paused initially
            currentNominatorTeamId: null,
            nominatedPlayer: null,
            startingBidAmount: 0,
            currentBid: null,
            bidTimer: null,
            bidTimerExpiresAt: null,
            auctionPhase: "idle",
            nominationOrder: [],
            currentNominationIndex: 0,
            draftType: "linear", // Default to linear
            timerDuration: 4, // Default timer duration
            autoStartTimer: false, // Default to manual start
            currentRound: 1, // Start at round 1
            currentPick: 1, // Start at pick 1
            totalPicks: 0, // No picks made yet
            teams: {},
            bidHistory: [],
          };
          this.resetAllowed = true;

          // Database operations handled by client

          this.room.broadcast(JSON.stringify({ type: "draftReset" }));
          break;
        case "startDraft":
          // Check if user is authorized (league owner)
          if (!connectionId || !this.isUserAuthorized(connectionId)) {
            console.log("PartyKit: Unauthorized startDraft attempt");
            break;
          }

          this.state = {
            ...this.state,
            draftStarted: true,
            draftPaused: false,
          };

          console.log("start draft on server");

          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        case "pauseDraft":
          // Check if user is authorized (league owner)
          if (!connectionId || !this.isUserAuthorized(connectionId)) {
            console.log("PartyKit: Unauthorized pauseDraft attempt");
            break;
          }

          // Clear any active countdown when pausing
          this.clearCountdown();

          this.state = {
            ...this.state,
            draftPaused: true,
            auctionPhase: "idle",
          };

          // Database operations handled by client

          this.room.broadcast(
            JSON.stringify({ type: "draftPaused", data: this.state })
          );
          break;
        case "resumeDraft":
          // Check if user is authorized (league owner)
          if (!connectionId || !this.isUserAuthorized(connectionId)) {
            console.log("PartyKit: Unauthorized resumeDraft attempt");
            break;
          }

          this.state = {
            ...this.state,
            draftPaused: false,
          };

          // Database operations handled by client

          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
          break;
        case "nominatePlayer": {
          // Check if draft is paused
          if (this.state.draftPaused) {
            break; // Ignore nomination if draft is paused
          }

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

          // Database operations handled by client

          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );

          // Auto-start timer if enabled
          if (this.state.autoStartTimer) {
            this.startAuctionCountdown();
          }
          break;
        }
        case "triggerCountdown": {
          // Check if draft is paused
          if (this.state.draftPaused) {
            break; // Ignore countdown trigger if draft is paused
          }

          // Only allow if auctionPhase is idle and a player is nominated
          if (
            this.state.auctionPhase === "idle" &&
            this.state.nominatedPlayer
          ) {
            this.clearCountdown();
            this.startAuctionCountdown();

            // Database operations handled by client
          }
          break;
        }
        case "bid": {
          // Check if draft is paused
          if (this.state.draftPaused) {
            break; // Ignore bid if draft is paused
          }

          // Cancel countdown if a bid is placed
          this.clearCountdown();
          this.state = { ...this.state, auctionPhase: "idle" };
          // message.data: { teamId, amount }
          const { teamId, amount } = message.data;

          // Validate bid amount
          const minBid = this.state.currentBid?.amount
            ? this.state.currentBid.amount + 1
            : 1;
          if (amount < minBid) {
            // Ignore invalid bid amount
            break;
          }

          // Validate team budget and roster spots
          if (!this.validateTeamBudget(teamId, amount)) {
            // Ignore bid if team doesn't have enough budget or roster spots
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

          // Database operations handled by client

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

  // Helper method to check if a user is authorized for admin actions
  isUserAuthorized(connectionId: string): boolean {
    const userInfo = this.authenticatedUsers.get(connectionId);
    return userInfo?.isOwner || false;
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
