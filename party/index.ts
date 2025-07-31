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

// Draft phase enum for better state management
export type DraftPhase = "pre" | "live" | "paused" | "complete";

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
};

export type DraftRoomState = {
  draftPhase: DraftPhase; // Replace draftStarted and draftPaused
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
  draftType: "snake" | "linear";
  timerEnabled: boolean;
  timerDuration: number;
  autoStartTimer: boolean;
  currentRound: number;
  currentPick: number;
  totalPicks: number;
  teams: Record<string, TeamDraftState>;
  bidHistory: Array<{
    amount: number;
    teamId: string;
    timestamp: string;
  }>;
  soldPlayer?: {
    playerId: string;
    teamId: string;
    price: number;
  };
  chatMessages: ChatMessage[]; // Add chat messages to state
};

class PartyRoom implements Party.Server {
  state: DraftRoomState = {
    draftPhase: "pre", // Start in pre-draft phase
    currentNominatorTeamId: null,
    nominatedPlayer: null,
    startingBidAmount: 0,
    currentBid: null,
    bidTimer: null,
    bidTimerExpiresAt: null,
    auctionPhase: "idle",
    nominationOrder: [],
    currentNominationIndex: 0,
    draftType: "snake",
    timerEnabled: false,
    timerDuration: 0,
    autoStartTimer: false,
    currentRound: 1,
    currentPick: 1,
    totalPicks: 0,
    teams: {},
    bidHistory: [],
    chatMessages: [], // Initialize empty chat messages array
  };
  resetAllowed = true; // Allow reset by default since we're not hydrating from DB
  hasLoadedFromDB = false; // Track if we've loaded state from database

  // Track connected user IDs (actual user IDs from Clerk)
  connectedUserIds = new Set<string>();

  // Track authenticated users and their roles
  authenticatedUsers = new Map<string, { userId: string; isOwner: boolean }>();

  // Track connection objects to their user IDs
  connectionToId = new WeakMap<Party.Connection, string>();

  countdownTimeout: NodeJS.Timeout | null = null;
  countdownPhase: "goingOnce" | "goingTwice" | "sold" | null = null;
  leagueTimerTimeout: NodeJS.Timeout | null = null;

  // Helper method for immutable state updates with broadcasting
  private updateState(
    updates: Partial<DraftRoomState>,
    broadcastType: "stateUpdate" | "draftPaused" | "draftReset" = "stateUpdate"
  ) {
    console.log("PartyKit: updateState called", {
      updates,
      broadcastType,
      currentTeamsCount: Object.keys(this.state.teams || {}).length,
      currentTeams: this.state.teams,
    });

    this.state = { ...this.state, ...updates };

    console.log("PartyKit: updateState completed", {
      newTeamsCount: Object.keys(this.state.teams || {}).length,
      newTeams: this.state.teams,
    });

    this.room.broadcast(
      JSON.stringify({ type: broadcastType, data: this.state })
    );
  }

  // Helper method to check if draft is active (live and not paused)
  private isDraftActive(): boolean {
    return this.state.draftPhase === "live";
  }

  // Helper method to validate draft state before actions
  private validateDraftState(action: string): boolean {
    if (this.state.draftPhase === "paused") {
      console.log(`PartyKit: Ignoring ${action} - draft is paused`);
      return false;
    }
    if (this.state.draftPhase !== "live") {
      console.log(
        `PartyKit: Ignoring ${action} - draft is not live (current phase: ${this.state.draftPhase})`
      );
      return false;
    }
    return true;
  }

  // Helper method to validate user authorization
  private validateUserAuth(
    userId: string | undefined,
    action: string
  ): boolean {
    if (!userId || !this.isUserAuthorized(userId)) {
      console.log(`PartyKit: Unauthorized ${action} attempt by user ${userId}`);
      return false;
    }
    return true;
  }

  // Helper method to get current timestamp
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // Helper method to check if draft is complete (all teams have filled rosters)
  private checkDraftCompletion(): boolean {
    const teams = Object.values(this.state.teams);
    if (teams.length === 0) return false;

    const allTeamsComplete = teams.every(
      (team) => team.remainingRosterSpots <= 0
    );
    if (allTeamsComplete && this.state.draftPhase === "live") {
      console.log("PartyKit: Draft completed - all teams have filled rosters");
      this.updateState({ draftPhase: "complete" });
      return true;
    }
    return false;
  }

  startAuctionCountdown() {
    if (this.countdownTimeout) {
      return;
    }

    // Auction countdown is always 4 seconds per phase
    const auctionCountdownDuration = 4;

    this.updateState({ auctionPhase: "goingOnce" });
    this.countdownPhase = "goingOnce";

    this.countdownTimeout = setTimeout(() => {
      this.updateState({ auctionPhase: "goingTwice" });
      this.countdownPhase = "goingTwice";

      this.countdownTimeout = setTimeout(async () => {
        this.updateState({ auctionPhase: "sold" });
        this.countdownPhase = "sold";
        this.countdownTimeout = null;
        await this.handleSoldPhase();
      }, auctionCountdownDuration * 1000);
    }, auctionCountdownDuration * 1000);
  }

  startLeagueTimer() {
    // Clear any existing league timer
    if (this.leagueTimerTimeout) {
      clearTimeout(this.leagueTimerTimeout);
    }

    // Check if timer is enabled and get league timer duration
    if (!this.state.timerEnabled || !this.state.timerDuration) {
      // Timer is disabled or no duration set, don't start timer
      return;
    }

    const leagueTimerDuration = this.state.timerDuration;

    // Set bid timer to league duration
    this.updateState({
      bidTimer: leagueTimerDuration,
      bidTimerExpiresAt: Date.now() + leagueTimerDuration * 1000,
    });

    // Start the league timer
    this.leagueTimerTimeout = setTimeout(() => {
      // League timer expired, start auction countdown
      this.startAuctionCountdown();
    }, leagueTimerDuration * 1000);
  }

  clearLeagueTimer() {
    if (this.leagueTimerTimeout) {
      clearTimeout(this.leagueTimerTimeout);
      this.leagueTimerTimeout = null;
    }

    this.updateState({
      bidTimer: null,
      bidTimerExpiresAt: null,
    });
  }

  clearCountdown() {
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
      this.countdownPhase = null;
    }
  }

  async handleSoldPhase() {
    console.log("PartyKit: handleSoldPhase called", {
      nominatedPlayer: this.state.nominatedPlayer,
      currentBid: this.state.currentBid,
      auctionPhase: this.state.auctionPhase,
    });

    // --- SOLD PHASE LOGIC ---

    // Capture player data before clearing it
    const soldPlayer = this.state.nominatedPlayer;
    const winningBid = this.state.currentBid;

    // Update team state in memory if there's a nominated player and winning bid
    if (soldPlayer && winningBid) {
      console.log("PartyKit: Updating team after acquisition", {
        teamId: winningBid.teamId,
        price: winningBid.amount,
        playerId: soldPlayer.id,
      });
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

    // Prepare the state update with sold player data if applicable
    const stateUpdateData: Partial<DraftRoomState> = {
      nominatedPlayer: null,
      currentBid: null,
      auctionPhase: "idle" as const,
      currentNominationIndex: nextNominationIndex,
      currentNominatorTeamId: nextNominatorTeamId,
      currentRound: newRound,
      currentPick: newPick,
      totalPicks: newTotalPicks,
      bidHistory: [],
      soldPlayer: undefined, // Clear any previous soldPlayer data
    };

    // Add sold player data to the state if a player was sold
    if (soldPlayer && winningBid) {
      stateUpdateData.soldPlayer = {
        playerId: soldPlayer.id,
        teamId: winningBid.teamId,
        price: winningBid.amount,
      };
    }

    this.updateState(stateUpdateData);

    console.log("PartyKit: handleSoldPhase completed", {
      soldPlayer: soldPlayer?.id,
      nextNominatorTeamId,
      newRound,
      newPick,
      newTotalPicks,
    });
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

      // Check if draft is complete after this acquisition
      this.checkDraftCompletion();
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

      // For now, allow all authenticated users to be owners
      // TODO: Implement proper league ownership check
      const isOwner = true;

      // Use the actual user ID for tracking
      const userId = authResult.userId!;
      this.connectedUserIds.add(userId);
      this.authenticatedUsers.set(userId, {
        userId: userId,
        isOwner: isOwner,
      });
      this.connectionToId.set(conn, userId);

      // Send welcome message
      conn.send(JSON.stringify({ type: "welcome", userId }));

      // Send initial state (but don't reset if draft is already in progress)
      conn.send(JSON.stringify({ type: "init", data: this.state }));
      this.broadcastUserList();
    } catch (error) {
      console.error("PartyKit: Error in onConnect:", error);
      conn.send(
        JSON.stringify({ type: "authError", error: "Connection error" })
      );
      conn.close();
    }

    // Clean up on disconnect
    conn.addEventListener("close", () => {
      const userId = this.connectionToId.get(conn);
      if (userId) {
        this.connectedUserIds.delete(userId);
        this.authenticatedUsers.delete(userId);
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

      // Get user ID for authorization checks
      const userId = this.connectionToId.get(conn);

      switch (message.type) {
        case "init":
          console.log("PartyKit: Received init message", {
            userId,
            message,
          });
          // Init message is now only used for initial state setup, not starting the draft
          // The draft should be started using the startDraft message instead
          console.log(
            "PartyKit: Init message received - draft should be started using startDraft message"
          );

          // If we haven't loaded from DB yet, send the current state
          // Otherwise, let the client handle state restoration
          if (!this.hasLoadedFromDB) {
            conn.send(JSON.stringify({ type: "init", data: this.state }));
          }
          break;
        case "hydrateState":
          // Accept hydrated state from client (no authorization check needed)
          if (message.data) {
            console.log("PartyKit: Accepting hydrated state from client", {
              teamsCount: Object.keys(message.data.teams || {}).length,
              draftPhase: message.data.draftPhase,
              currentNominatorTeamId: message.data.currentNominatorTeamId,
            });
            this.updateState({ ...message.data });
          }
          break;
        case "restoreState":
          // Accept restored state from database (no authorization check needed)
          if (message.data) {
            // Calculate snake draft direction for debugging
            const totalTeams = message.data.nominationOrder?.length || 0;
            const currentRoundFromIndex = Math.floor(
              message.data.currentNominationIndex / totalTeams
            );
            const isReverseRound = currentRoundFromIndex % 2 === 1;
            const positionInRound =
              message.data.currentNominationIndex % totalTeams;

            console.log("PartyKit: Restoring state from database", {
              teamsCount: Object.keys(message.data.teams || {}).length,
              draftPhase: message.data.draftPhase,
              currentNominatorTeamId: message.data.currentNominatorTeamId,
              currentNominationIndex: message.data.currentNominationIndex,
              nominationOrder: message.data.nominationOrder,
              draftType: message.data.draftType,
              currentRoundFromIndex,
              isReverseRound,
              positionInRound,
              snakeDirection: isReverseRound ? "reverse" : "forward",
            });
            this.updateState({ ...message.data });
            this.hasLoadedFromDB = true;
          }
          break;
        case "resetDraft":
          // Check if user is authorized (league owner)
          if (!this.validateUserAuth(userId, "resetDraft")) {
            break;
          }

          // Database operations handled by client

          this.updateState(
            {
              draftPhase: "pre", // Reset to pre-draft phase
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
              timerEnabled: false, // Default to timer disabled
              timerDuration: 60, // Default timer duration (when enabled)
              autoStartTimer: true, // Default to auto-start timer
              currentRound: 1, // Start at round 1
              currentPick: 1, // Start at pick 1
              totalPicks: 0, // No picks made yet
              teams: {},
              bidHistory: [],
            },
            "draftReset"
          );
          this.resetAllowed = true;
          this.hasLoadedFromDB = false;
          break;
        case "startDraft":
          // Check if user is authorized (league owner)
          if (!this.validateUserAuth(userId, "startDraft")) {
            break;
          }

          console.log("PartyKit: Starting draft - setting draftPhase to live", {
            currentTeamsCount: Object.keys(this.state.teams || {}).length,
            currentTeams: this.state.teams,
            currentState: this.state,
          });

          // Preserve all existing state data, only update the draft phase
          this.updateState({
            draftPhase: "live", // Transition to live phase
          });

          console.log("PartyKit: Draft started - state after update", {
            teamsCount: Object.keys(this.state.teams || {}).length,
            teams: this.state.teams,
          });

          // Send draftStarted message to trigger database save
          this.room.broadcast(
            JSON.stringify({
              type: "draftStarted",
              data: this.state,
            })
          );

          this.hasLoadedFromDB = true;
          break;
        case "pauseDraft":
          // Check if user is authorized (league owner)
          if (!this.validateUserAuth(userId, "pauseDraft")) {
            break;
          }

          // Clear any active countdown when pausing
          this.clearCountdown();

          this.updateState(
            {
              draftPhase: "paused", // Transition to paused phase
              auctionPhase: "idle",
            },
            "draftPaused"
          );
          break;
        case "resumeDraft":
          // Check if user is authorized (league owner)
          if (!this.validateUserAuth(userId, "resumeDraft")) {
            break;
          }

          this.updateState({
            draftPhase: "live", // Transition to live phase
          });
          break;
        case "nominatePlayer": {
          // Check if draft is active
          if (!this.validateDraftState("nominatePlayer")) {
            break;
          }

          // message.data: { teamId, amount, player: { id, firstName, lastName, team, position } }
          this.clearCountdown();
          const { teamId, amount, player } = message.data;
          this.updateState({
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
          });

          // Auto-start league timer
          this.startLeagueTimer();
          break;
        }
        case "triggerCountdown": {
          // Check if draft is active
          if (!this.validateDraftState("triggerCountdown")) {
            break;
          }

          // Only allow if auctionPhase is idle and a player is nominated
          if (
            this.state.auctionPhase === "idle" &&
            this.state.nominatedPlayer
          ) {
            this.clearCountdown();
            this.clearLeagueTimer();
            this.startAuctionCountdown();

            // Database operations handled by client
          }
          break;
        }
        case "bid": {
          // Check if draft is active
          if (!this.validateDraftState("bid")) {
            break;
          }

          // Cancel auction countdown if a bid is placed
          this.clearCountdown();

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
            timestamp: this.getCurrentTimestamp(),
          };
          const newBidHistory = [...this.state.bidHistory, newBid].slice(-10);

          this.updateState({
            currentBid: { amount, teamId },
            bidHistory: newBidHistory,
            auctionPhase: "idle",
          });

          // Handle timer logic based on current phase
          if (
            this.countdownPhase === "goingOnce" ||
            this.countdownPhase === "goingTwice"
          ) {
            // Bid came in during auction countdown - reset to 10 seconds before starting auction countdown again
            this.clearLeagueTimer();
            this.updateState({
              bidTimer: 10,
              bidTimerExpiresAt: Date.now() + 10 * 1000,
            });

            // Start 10-second timer before auction countdown
            this.leagueTimerTimeout = setTimeout(() => {
              this.startAuctionCountdown();
            }, 10 * 1000);
          } else {
            // Normal bid during idle phase - restart league timer
            this.clearLeagueTimer();
            this.startLeagueTimer();
          }

          // Database operations handled by client
          break;
        }
        case "offlineAuctionComplete": {
          // Check if draft is active
          if (!this.validateDraftState("offlineAuctionComplete")) {
            break;
          }

          // Only allow in idle phase with a nominated player
          if (
            this.state.auctionPhase === "idle" &&
            this.state.nominatedPlayer
          ) {
            const { teamId, amount } = message.data;

            // Validate team budget
            if (!this.validateTeamBudget(teamId, amount)) {
              console.log(`Team ${teamId} cannot afford bid amount: ${amount}`);
              break;
            }

            // Set the winning bid
            this.state.currentBid = {
              amount,
              teamId,
            };

            // Mark player as sold
            this.state.soldPlayer = {
              playerId: this.state.nominatedPlayer.id,
              teamId,
              price: amount,
            };

            // Clear nominated player and current bid
            this.state.nominatedPlayer = null;
            this.state.currentBid = null;
            this.state.bidHistory = [];

            // Update team state
            this.updateTeamAfterAcquisition(teamId, amount);

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

            // Broadcast state update
            this.updateState({
              nominatedPlayer: null,
              currentBid: null,
              auctionPhase: "idle" as const,
              currentNominationIndex: nextNominationIndex,
              currentNominatorTeamId: nextNominatorTeamId,
              currentRound: newRound,
              currentPick: newPick,
              totalPicks: newTotalPicks,
              bidHistory: [],
              soldPlayer: {
                playerId: this.state.nominatedPlayer!.id,
                teamId,
                price: amount,
              },
            });
          }
          break;
        }
        case "chatMessage": {
          // Store and broadcast chat message to all connected users
          // No authorization check needed for chat messages
          if (message.data) {
            const chatMessage: ChatMessage = {
              id: message.data.id || `${Date.now()}-${Math.random()}`,
              userId: message.data.userId,
              userName: message.data.userName,
              message: message.data.message,
              timestamp: message.data.timestamp,
            };

            console.log("PartyKit: Storing and broadcasting chat message", {
              userId: chatMessage.userId,
              userName: chatMessage.userName,
              messageLength: chatMessage.message?.length || 0,
            });
            
            // Add message to state (keep last 100 messages)
            const newChatMessages = [...this.state.chatMessages, chatMessage].slice(-100);
            this.updateState({
              chatMessages: newChatMessages,
            });
            
            // Broadcast the chat message to all connected users
            this.room.broadcast(JSON.stringify({
              type: "chatMessage",
              data: chatMessage,
            }));
          }
          break;
        }

        default:
          conn.send(JSON.stringify({ echo: message }));
          break;
      }
    });
  }

  // Helper method to check if a user is authorized for admin actions
  isUserAuthorized(userId: string): boolean {
    const userInfo = this.authenticatedUsers.get(userId);
    const isAuthorized = userInfo?.isOwner || false;
    console.log("Authorization check:", {
      userId,
      userInfo,
      isAuthorized,
    });
    return isAuthorized;
  }

  broadcastUserList() {
    // Extract actual user IDs from authenticated users
    const userIds = Array.from(this.authenticatedUsers.values()).map(
      (user) => user.userId
    );
    this.room.broadcast(
      JSON.stringify({
        type: "connectedUsers",
        userIds: userIds,
      })
    );
  }
}

export default PartyRoom;
