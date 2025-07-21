/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as Party from "partykit/server";
import { db } from "@/lib/db";
import { leagues, teams, nflPlayers, draftedPlayers } from "@/app/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

// Message types for draft events
export enum DraftMessageType {
  // Connection management
  JOIN_ROOM = "JOIN_ROOM",
  LEAVE_ROOM = "LEAVE_ROOM",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",

  // Draft state
  DRAFT_STATE_UPDATE = "DRAFT_STATE_UPDATE",
  DRAFT_STARTED = "DRAFT_STARTED",
  DRAFT_ENDED = "DRAFT_ENDED",
  START_DRAFT = "START_DRAFT",

  // Nominations
  NOMINATE_PLAYER = "NOMINATE_PLAYER",
  PLAYER_NOMINATED = "PLAYER_NOMINATED",

  // Bidding
  PLACE_BID = "PLACE_BID",
  BID_PLACED = "BID_PLACED",

  // Countdown
  START_COUNTDOWN = "START_COUNTDOWN",
  COUNTDOWN_UPDATE = "COUNTDOWN_UPDATE",
  COUNTDOWN_ENDED = "COUNTDOWN_ENDED",

  // Player acquisition
  PLAYER_ACQUIRED = "PLAYER_ACQUIRED",
  SAVING_PLAYER = "SAVING_PLAYER",

  // Turn management
  TURN_CHANGE = "TURN_CHANGE",

  // Budget updates
  BUDGET_UPDATED = "BUDGET_UPDATED",

  // Error handling
  ERROR = "ERROR",

  // Test mode
  TEST_MODE_TOGGLE = "TEST_MODE_TOGGLE",
}

export interface DraftMessage {
  type: DraftMessageType;
  data?: any;
  timestamp: number;
  senderId?: string;
}

interface DraftParticipant {
  connectionId: string;
  userId: string;
  teamId: string;
  teamName: string;
  isActive: boolean;
  joinedAt: number;
  lastActivity: number;
}

interface DraftRoomState {
  leagueId: string;
  participants: Map<string, DraftParticipant>;
  currentNomination: {
    id: string;
    playerId: string;
    playerName: string;
    currentBid: number;
    highestBidderId: string;
    nominatingTeamId: string;
    startedAt: number;
  } | null;
  currentTurnTeamId: string | null;
  phase: string;
  countdown: {
    active: boolean;
    endTime: number;
    duration: number;
  } | null;
  bids: Array<{
    id: string;
    teamId: string;
    amount: number;
    timestamp: number;
  }>;
  saving: boolean;
  testMode: boolean;
  leagueSettings: {
    timerEnabled: boolean;
    timerDuration: number;
  } | null;
}

export default class DraftRoomServer implements Party.Server {
  private state: DraftRoomState;
  private countdownTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(readonly room: Party.Room) {
    console.log(`🚀 Draft Room Server STARTED for league: ${room.id}`);

    // Initialize draft room state
    this.state = {
      leagueId: room.id, // Room ID corresponds to league ID
      participants: new Map(),
      currentNomination: null,
      currentTurnTeamId: null,
      phase: "nominating",
      countdown: null,
      bids: [],
      saving: false,
      testMode: false,
      leagueSettings: null,
    };

    console.log(`📊 Initial state:`, this.state);

    // Restore state from database
    this.restoreStateFromDatabase();

    // Start heartbeat to monitor participant activity
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      // Clean up stale participants (inactive for more than 30 seconds)
      const now = Date.now();
      const staleThreshold = 30000; // 30 seconds

      for (const [userId, participant] of this.state.participants) {
        if (now - participant.lastActivity > staleThreshold) {
          // Check if connection is still valid
          const connection = this.room.getConnection(participant.connectionId);
          if (!connection) {
            this.state.participants.delete(userId);
            this.broadcastMessage({
              type: DraftMessageType.USER_LEFT,
              data: {
                userId: participant.userId,
                teamId: participant.teamId,
                teamName: participant.teamName,
              },
              timestamp: Date.now(),
            });
          }
        }
      }

      // Broadcast participant status every 10 seconds
      this.broadcastMessage({
        type: DraftMessageType.DRAFT_STATE_UPDATE,
        data: this.getPublicState(),
        timestamp: Date.now(),
      });
    }, 10000); // Every 10 seconds
  }

  onRequest(req: Party.Request) {
    // Handle HTTP requests (required for PartySocket connections)
    if (req.method === "GET") {
      return new Response("Draft Room Server", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Draft room ${this.room.id}: Connection ${conn.id} joined`);

    // Send current draft state to new connection
    this.sendMessage(conn, {
      type: DraftMessageType.DRAFT_STATE_UPDATE,
      data: this.getPublicState(),
      timestamp: Date.now(),
    });
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const parsedMessage: DraftMessage = JSON.parse(message);

      // Update participant activity
      this.updateParticipantActivity(sender.id);

      // Handle message asynchronously
      this.handleMessage(parsedMessage, sender).catch((error) => {
        console.error("Error handling message:", error);
        this.sendError(sender, "Failed to process message");
      });
    } catch (error) {
      console.error(
        `Error parsing message in draft room ${this.room.id}:`,
        error
      );
      this.sendError(sender, "Invalid message format");
    }
  }

  private updateParticipantActivity(connectionId: string) {
    for (const participant of this.state.participants.values()) {
      if (participant.connectionId === connectionId) {
        participant.lastActivity = Date.now();
        break;
      }
    }
  }

  onClose(conn: Party.Connection) {
    console.log(
      `Draft room ${this.room.id}: Connection ${conn.id} disconnected`
    );

    // Find and remove participant
    const participant = Array.from(this.state.participants.values()).find(
      (p) => p.connectionId === conn.id
    );

    if (participant) {
      this.state.participants.delete(participant.userId);
      this.broadcastMessage({
        type: DraftMessageType.USER_LEFT,
        data: {
          userId: participant.userId,
          teamId: participant.teamId,
          teamName: participant.teamName,
        },
        timestamp: Date.now(),
      });
    }
  }

  private async handleMessage(message: DraftMessage, sender: Party.Connection) {
    console.log(`📨 RECEIVED MESSAGE: ${message.type}`, message.data);

    switch (message.type) {
      case DraftMessageType.JOIN_ROOM:
        this.handleJoinRoom(message, sender);
        break;

      case DraftMessageType.NOMINATE_PLAYER:
        console.log("🎯 Processing NOMINATE_PLAYER message");
        await this.handleNominatePlayer(message, sender);
        break;

      case DraftMessageType.PLACE_BID:
        await this.handlePlaceBid(message, sender);
        break;

      case DraftMessageType.START_COUNTDOWN:
        this.handleStartCountdown(message, sender);
        break;

      case DraftMessageType.START_DRAFT:
        await this.handleStartDraft(message, sender);
        break;

      case DraftMessageType.TEST_MODE_TOGGLE:
        this.handleTestModeToggle(message, sender);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
        this.sendError(sender, "Unknown message type");
    }
  }

  private handleJoinRoom(message: DraftMessage, sender: Party.Connection) {
    const { userId, teamId, teamName } = message.data;

    if (!userId || !teamId || !teamName) {
      this.sendError(sender, "Missing required user information");
      return;
    }

    // Add or update participant
    const participant: DraftParticipant = {
      connectionId: sender.id,
      userId,
      teamId,
      teamName,
      isActive: true,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.state.participants.set(userId, participant);

    // Broadcast user joined
    this.broadcastMessage({
      type: DraftMessageType.USER_JOINED,
      data: {
        userId,
        teamId,
        teamName,
        participantCount: this.state.participants.size,
      },
      timestamp: Date.now(),
    });

    // Send acknowledgment
    this.sendMessage(sender, {
      type: DraftMessageType.DRAFT_STATE_UPDATE,
      data: this.getPublicState(),
      timestamp: Date.now(),
    });
  }

  private async handleNominatePlayer(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    try {
      console.log("🏈 RECEIVED NOMINATION MESSAGE:", message.data);

      const { playerId, playerName, nominationAmount, teamId, userId } =
        message.data;

      console.log("🔍 Current state before nomination:", {
        currentTurnTeamId: this.state.currentTurnTeamId,
        teamId,
        currentNomination: this.state.currentNomination,
        phase: this.state.phase,
      });

      // Validate nomination - check if it's team's turn and no active nomination
      if (this.state.currentTurnTeamId !== teamId) {
        console.log("❌ NOMINATION REJECTED: Not team's turn", {
          currentTurnTeamId: this.state.currentTurnTeamId,
          teamId,
        });
        this.sendError(sender, "Not your turn to nominate");
        return;
      }

      if (this.state.currentNomination) {
        console.log("❌ NOMINATION REJECTED: Another nomination in progress");
        this.sendError(sender, "Another nomination is in progress");
        return;
      }

      // Verify user owns the team
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(eq(teams.id, teamId), eq(teams.ownerId, userId)))
        .limit(1);

      if (userTeam.length === 0) {
        this.sendError(sender, "Not authorized to nominate for this team");
        return;
      }

      // Verify player exists and is available
      const player = await db
        .select()
        .from(nflPlayers)
        .where(eq(nflPlayers.id, playerId))
        .limit(1);

      if (player.length === 0) {
        this.sendError(sender, "Player not found");
        return;
      }

      // Check if player is already drafted in this league
      const existingDraftedPlayer = await db
        .select()
        .from(draftedPlayers)
        .where(
          and(
            eq(draftedPlayers.playerId, playerId),
            eq(draftedPlayers.leagueId, this.state.leagueId)
          )
        )
        .limit(1);

      if (existingDraftedPlayer.length > 0) {
        this.sendError(sender, "Player is already drafted");
        return;
      }

      // Check if team has enough budget for nomination
      const teamBudget = await this.getTeamRemainingBudget(teamId);
      if (teamBudget < nominationAmount) {
        this.sendError(sender, "Insufficient budget for nomination");
        return;
      }

      // Create nomination in memory only
      const nominationData = {
        id: `nomination_${Date.now()}`,
        playerId,
        playerName,
        currentBid: nominationAmount,
        highestBidderId: teamId,
        nominatingTeamId: teamId,
        startedAt: Date.now(),
      };

      this.state.currentNomination = nominationData;
      this.state.phase = "bidding";
      this.state.bids = [
        {
          id: `bid_${Date.now()}`,
          teamId,
          amount: nominationAmount,
          timestamp: Date.now(),
        },
      ];

      console.log(
        `🏈 NOMINATION CREATED: Player ${playerName} nominated for $${nominationAmount} by team ${teamId}`
      );
      console.log(`📊 Current nomination state:`, this.state.currentNomination);

      // Broadcast nomination
      this.broadcastMessage({
        type: DraftMessageType.PLAYER_NOMINATED,
        data: {
          nomination: nominationData,
          bids: this.state.bids,
          phase: this.state.phase,
        },
        timestamp: Date.now(),
      });

      // Start automatic timer if enabled
      if (
        this.state.leagueSettings?.timerEnabled &&
        this.state.leagueSettings.timerDuration > 0
      ) {
        setTimeout(() => {
          // Only start timer if nomination is still active and no countdown is running
          if (
            this.state.currentNomination?.id === nominationData.id &&
            !this.state.countdown?.active
          ) {
            this.startCountdown(
              this.state.leagueSettings!.timerDuration * 1000
            ); // Convert to milliseconds
          }
        }, 1000); // Wait 1 second before starting timer
      }
    } catch (error) {
      console.error("Error nominating player:", error);
      this.sendError(sender, "Failed to nominate player");
    }
  }

  private async handlePlaceBid(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    try {
      const { teamId, amount, userId } = message.data;

      console.log(`💰 BID ATTEMPT: Team ${teamId} trying to bid $${amount}`);
      console.log(`🔍 Current nomination state:`, this.state.currentNomination);

      // Validate bid - only check if there's an active nomination
      if (!this.state.currentNomination) {
        console.log(`❌ BID REJECTED: No active nomination found`);
        this.sendError(sender, "No active nomination");
        return;
      }

      if (amount <= this.state.currentNomination.currentBid) {
        this.sendError(sender, "Bid must be higher than current bid");
        return;
      }

      // Verify user owns the team
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(eq(teams.id, teamId), eq(teams.ownerId, userId)))
        .limit(1);

      if (userTeam.length === 0) {
        this.sendError(sender, "Not authorized to bid for this team");
        return;
      }

      // Check if team has enough budget
      const teamBudget = await this.getTeamRemainingBudget(teamId);
      if (teamBudget < amount) {
        this.sendError(sender, "Insufficient budget for bid");
        return;
      }

      // Update nomination in memory only

      // Clear countdown if active
      if (this.state.countdown?.active) {
        this.clearCountdown();
      }

      // Update local state
      this.state.currentNomination.currentBid = amount;
      this.state.currentNomination.highestBidderId = teamId;

      const newBid = {
        id: `bid_${Date.now()}`,
        teamId,
        amount,
        timestamp: Date.now(),
      };

      this.state.bids.unshift(newBid); // Add to beginning for newest first

      // Broadcast bid
      this.broadcastMessage({
        type: DraftMessageType.BID_PLACED,
        data: {
          bid: newBid,
          nomination: this.state.currentNomination,
          bids: this.state.bids,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error placing bid:", error);
      this.sendError(sender, "Failed to place bid");
    }
  }

  private handleStartCountdown(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    const { duration = 10000 } = message.data; // Default 10 seconds

    // Can only start countdown when there's an active nomination
    if (!this.state.currentNomination) {
      this.sendError(sender, "No active nomination");
      return;
    }

    this.startCountdown(duration);
  }

  private handleTestModeToggle(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    const { enabled } = message.data;
    this.state.testMode = enabled;

    // Broadcast test mode change
    this.broadcastMessage({
      type: DraftMessageType.TEST_MODE_TOGGLE,
      data: { enabled },
      timestamp: Date.now(),
    });
  }

  private async handleStartDraft(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    try {
      const { firstTeamId } = message.data;

      if (!firstTeamId) {
        this.sendError(sender, "First team ID is required");
        return;
      }

      // Set the first team's turn
      this.state.currentTurnTeamId = firstTeamId;
      this.state.phase = "nominating";

      console.log(
        `🏈 DRAFT STARTED: First team ${firstTeamId} can now nominate`
      );

      // Broadcast draft started
      this.broadcastMessage({
        type: DraftMessageType.DRAFT_STARTED,
        data: {
          firstTeamId,
          phase: "nominating",
        },
        timestamp: Date.now(),
      });

      // Also broadcast state update
      this.broadcastMessage({
        type: DraftMessageType.DRAFT_STATE_UPDATE,
        data: this.getPublicState(),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error starting draft:", error);
      this.sendError(sender, "Failed to start draft");
    }
  }

  private startCountdown(duration: number) {
    // Clear existing countdown
    this.clearCountdown();

    const endTime = Date.now() + duration;
    this.state.countdown = {
      active: true,
      endTime,
      duration,
    };

    // Broadcast countdown start
    this.broadcastMessage({
      type: DraftMessageType.START_COUNTDOWN,
      data: {
        duration,
        endTime,
      },
      timestamp: Date.now(),
    });

    // Set timer to end countdown
    this.countdownTimer = setTimeout(() => {
      this.endCountdown();
    }, duration);
  }

  private clearCountdown() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.state.countdown?.active) {
      this.state.countdown.active = false;
    }
  }

  private async endCountdown() {
    try {
      if (!this.state.currentNomination) {
        return;
      }

      const nomination = this.state.currentNomination;
      this.state.countdown = null;
      this.state.saving = true;
      this.state.phase = "saving";

      // Broadcast saving state
      this.broadcastMessage({
        type: DraftMessageType.SAVING_PLAYER,
        data: {
          playerId: nomination.playerId,
          playerName: nomination.playerName,
          teamId: nomination.highestBidderId,
          finalBid: nomination.currentBid,
        },
        timestamp: Date.now(),
      });

      // Get player details from database
      const player = await db
        .select()
        .from(nflPlayers)
        .where(eq(nflPlayers.id, nomination.playerId))
        .limit(1);

      if (player.length === 0) {
        console.error("Player not found for acquisition");
        this.state.saving = false;
        return;
      }

      const playerData = player[0];

      // Get winning team
      const winningTeam = await db
        .select()
        .from(teams)
        .where(eq(teams.id, nomination.highestBidderId))
        .limit(1);

      if (winningTeam.length === 0) {
        console.error("Winning team not found");
        this.state.saving = false;
        return;
      }

      // Add player to drafted players table
      const draftedPlayerEntry = await db
        .insert(draftedPlayers)
        .values({
          teamId: winningTeam[0].id,
          playerId: playerData.id,
          leagueId: this.state.leagueId,
          draftPrice: nomination.currentBid,
        })
        .returning();

      // Move to next team's turn
      const nextTeamId = await this.getNextTeamTurn(
        this.state.leagueId,
        nomination.nominatingTeamId
      );

      // Calculate updated budgets and roster counts for all teams
      const teamBudgets = await this.calculateAllTeamBudgets();

      // Broadcast countdown ended and player acquired
      this.broadcastMessage({
        type: DraftMessageType.COUNTDOWN_ENDED,
        data: {
          nominationId: nomination.id,
        },
        timestamp: Date.now(),
      });

      this.broadcastMessage({
        type: DraftMessageType.PLAYER_ACQUIRED,
        data: {
          playerId: nomination.playerId,
          playerName: nomination.playerName,
          teamId: nomination.highestBidderId,
          finalBid: nomination.currentBid,
          nominationId: nomination.id,
          nextTurnTeamId: nextTeamId,
          draftedPlayerId: draftedPlayerEntry[0].id,
        },
        timestamp: Date.now(),
      });

      // Broadcast budget updates
      this.broadcastMessage({
        type: DraftMessageType.BUDGET_UPDATED,
        data: {
          teamBudgets,
        },
        timestamp: Date.now(),
      });

      // Clear current nomination and reset state
      this.state.currentNomination = null;
      this.state.bids = [];
      this.state.currentTurnTeamId = nextTeamId;
      this.state.phase = "nominating";
      this.state.saving = false;

      // Broadcast turn change
      this.broadcastMessage({
        type: DraftMessageType.TURN_CHANGE,
        data: {
          newTurnTeamId: nextTeamId,
          phase: "nominating",
        },
        timestamp: Date.now(),
      });

      // Also broadcast general state update
      this.broadcastMessage({
        type: DraftMessageType.DRAFT_STATE_UPDATE,
        data: this.getPublicState(),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error ending countdown and acquiring player:", error);
      this.state.saving = false;
      this.state.phase = "bidding"; // Revert to bidding phase
      this.broadcastMessage({
        type: DraftMessageType.ERROR,
        data: { error: "Failed to acquire player" },
        timestamp: Date.now(),
      });
    }
  }

  // Method to update turn from external source (API)
  updateTurn(newTurnTeamId: string) {
    this.state.currentTurnTeamId = newTurnTeamId;

    // Broadcast turn change
    this.broadcastMessage({
      type: DraftMessageType.TURN_CHANGE,
      data: {
        newTurnTeamId,
      },
      timestamp: Date.now(),
    });

    // Also broadcast general state update
    this.broadcastMessage({
      type: DraftMessageType.DRAFT_STATE_UPDATE,
      data: this.getPublicState(),
      timestamp: Date.now(),
    });
  }

  // Method to broadcast budget updates from external source (API)
  updateBudgets(
    teamBudgets: Array<{
      teamId: string;
      remainingBudget: number;
      remainingRosterSlots: number;
    }>
  ) {
    this.broadcastMessage({
      type: DraftMessageType.BUDGET_UPDATED,
      data: {
        teamBudgets,
      },
      timestamp: Date.now(),
    });
  }

  private sendMessage(conn: Party.Connection, message: DraftMessage) {
    conn.send(JSON.stringify(message));
  }

  private broadcastMessage(message: DraftMessage) {
    this.room.broadcast(JSON.stringify(message));
  }

  private sendError(conn: Party.Connection, error: string) {
    this.sendMessage(conn, {
      type: DraftMessageType.ERROR,
      data: { error },
      timestamp: Date.now(),
    });
  }

  private getPublicState() {
    const publicState = {
      leagueId: this.state.leagueId,
      participants: Array.from(this.state.participants.values()),
      currentNomination: this.state.currentNomination,
      currentTurnTeamId: this.state.currentTurnTeamId,
      phase: this.state.phase,
      countdown: this.state.countdown,
      bids: this.state.bids,
      saving: this.state.saving,
      testMode: this.state.testMode,
      leagueSettings: this.state.leagueSettings,
    };

    console.log(`📡 Broadcasting public state:`, publicState);
    return publicState;
  }

  // Cleanup method for when room shuts down
  onAlarm() {
    this.cleanup();
  }

  private cleanup() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Helper methods for database operations
  private async calculateAllTeamBudgets(): Promise<
    Array<{
      teamId: string;
      remainingBudget: number;
      remainingRosterSlots: number;
    }>
  > {
    try {
      // Get all teams in the league
      const teamsInLeague = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, this.state.leagueId));

      // Get league settings for roster size
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, this.state.leagueId))
        .limit(1);

      if (league.length === 0) {
        return [];
      }

      const leagueData = league[0];
      const totalRosterSlots = leagueData.rosterSize || 16;

      const teamBudgets = [];

      for (const team of teamsInLeague) {
        // Get total spent and roster count for this team
        const teamDraftData = await db
          .select({
            totalSpent: sql<number>`COALESCE(SUM(${draftedPlayers.draftPrice}), 0)`,
            rosterCount: sql<number>`COUNT(${draftedPlayers.id})`,
          })
          .from(draftedPlayers)
          .where(eq(draftedPlayers.teamId, team.id));

        const totalSpent = teamDraftData[0]?.totalSpent || 0;
        const rosterCount = teamDraftData[0]?.rosterCount || 0;
        const remainingRosterSlots = totalRosterSlots - rosterCount;

        // Calculate available budget minus minimum $1 per remaining slot
        const grossRemainingBudget = (team.budget || 200) - totalSpent;
        const minimumReserved = Math.max(0, remainingRosterSlots - 1);
        const availableBudget = grossRemainingBudget - minimumReserved;

        teamBudgets.push({
          teamId: team.id,
          remainingBudget: Math.max(0, availableBudget),
          remainingRosterSlots,
        });
      }

      return teamBudgets;
    } catch (error) {
      console.error("Error calculating team budgets:", error);
      return [];
    }
  }

  private async getTeamRemainingBudget(teamId: string): Promise<number> {
    try {
      // Get team budget
      const team = await db
        .select({ budget: teams.budget, leagueId: teams.leagueId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      if (team.length === 0) {
        return 0;
      }

      // Get league settings for total roster slots
      if (!team[0].leagueId) {
        return 0;
      }

      const leagueQuery = await db
        .select({
          rosterSize: leagues.rosterSize,
        })
        .from(leagues)
        .where(eq(leagues.id, team[0].leagueId))
        .limit(1);

      if (leagueQuery.length === 0) {
        return 0;
      }

      const totalRosterSlots = leagueQuery[0].rosterSize || 16;

      // Get total spent on drafted players and current roster count
      const rosterData = await db
        .select({
          totalSpent: sql<number>`COALESCE(SUM(${draftedPlayers.draftPrice}), 0)`,
          rosterCount: sql<number>`COUNT(${draftedPlayers.id})`,
        })
        .from(draftedPlayers)
        .where(eq(draftedPlayers.teamId, teamId));

      const totalSpent = rosterData[0]?.totalSpent || 0;
      const rosterCount = rosterData[0]?.rosterCount || 0;
      const remainingRosterSlots = totalRosterSlots - rosterCount;

      // Calculate available budget minus minimum $1 per remaining slot
      const grossRemainingBudget = (team[0].budget || 200) - totalSpent;
      const minimumReserved = Math.max(0, remainingRosterSlots - 1); // Subtract 1 because current bid counts as 1 slot
      const availableBudget = grossRemainingBudget - minimumReserved;

      return Math.max(0, availableBudget);
    } catch (error) {
      console.error("Error calculating team budget:", error);
      return 0;
    }
  }

  private async getNextTeamTurn(
    leagueId: string,
    currentTeamId: string
  ): Promise<string> {
    try {
      // Get league settings for draft type
      const league = await db
        .select({
          draftType: leagues.draftType,
        })
        .from(leagues)
        .where(eq(leagues.id, leagueId))
        .limit(1);

      const draftType = league[0]?.draftType || "linear";

      // Get all teams with draft order
      const teamsResult = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, leagueId))
        .orderBy(teams.draftOrder);

      // Find current team index
      const currentTeamIndex = teamsResult.findIndex(
        (team) => team.id === currentTeamId
      );

      if (draftType === "linear") {
        // Linear: Always go to next team in order
        const nextTeamIndex = (currentTeamIndex + 1) % teamsResult.length;
        return teamsResult[nextTeamIndex].id;
      } else if (draftType === "snake") {
        // Snake: Calculate based on total players drafted and round

        // Count total players drafted in this league
        const totalDrafted = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(draftedPlayers)
          .where(eq(draftedPlayers.leagueId, leagueId));

        const playersPerRound = teamsResult.length;
        const completedRounds = Math.floor(
          (totalDrafted[0]?.count || 0) / playersPerRound
        );
        const currentRound = completedRounds + 1; // 1-indexed

        // Even rounds go in reverse order for snake
        const isReverseRound = currentRound % 2 === 0;

        if (isReverseRound) {
          // Go backwards in draft order
          const nextTeamIndex = currentTeamIndex - 1;
          if (nextTeamIndex < 0) {
            // Wrap to end of next round (back to normal order)
            return teamsResult[teamsResult.length - 1].id;
          }
          return teamsResult[nextTeamIndex].id;
        } else {
          // Go forwards in draft order
          const nextTeamIndex = currentTeamIndex + 1;
          if (nextTeamIndex >= teamsResult.length) {
            // Wrap to start of next round (reverse order)
            return teamsResult[teamsResult.length - 1].id;
          }
          return teamsResult[nextTeamIndex].id;
        }
      }

      // Fallback to linear
      const nextTeamIndex = (currentTeamIndex + 1) % teamsResult.length;
      return teamsResult[nextTeamIndex].id;
    } catch (error) {
      console.error("Error getting next team turn:", error);
      // Fallback: return current team
      return currentTeamId;
    }
  }

  private async restoreStateFromDatabase() {
    try {
      console.log(
        `🔄 Restoring state from database for league: ${this.state.leagueId}`
      );

      // Load league settings first
      const league = await db
        .select({
          timerEnabled: leagues.timerEnabled,
          timerDuration: leagues.timerDuration,
        })
        .from(leagues)
        .where(eq(leagues.id, this.state.leagueId))
        .limit(1);

      if (league.length > 0) {
        this.state.leagueSettings = {
          timerEnabled: Boolean(league[0].timerEnabled),
          timerDuration: league[0].timerDuration || 60,
        };
      }

      // Since we're managing all draft state in memory, we start fresh on each room restart
      console.log(
        `🆕 Starting fresh draft state for league ${this.state.leagueId} - all state managed in memory`
      );
    } catch (error) {
      console.error("❌ Error restoring state from database:", error);
    }
  }
}
