/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as Party from "partykit/server";

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

  // Turn management
  TURN_CHANGE = "TURN_CHANGE",

  // Error handling
  ERROR = "ERROR",
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
  countdown: {
    active: boolean;
    endTime: number;
    duration: number;
  } | null;
  phase: "waiting" | "nominating" | "bidding" | "completed";
  bids: Array<{
    id: string;
    teamId: string;
    amount: number;
    timestamp: number;
  }>;
}

export default class DraftRoomServer implements Party.Server {
  private state: DraftRoomState;
  private countdownTimer: NodeJS.Timeout | null = null;

  constructor(readonly room: Party.Room) {
    // Initialize draft room state
    this.state = {
      leagueId: room.id, // Room ID corresponds to league ID
      participants: new Map(),
      currentNomination: null,
      currentTurnTeamId: null,
      countdown: null,
      phase: "waiting",
      bids: [],
    };
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
      this.handleMessage(parsedMessage, sender);
    } catch (error) {
      console.error(
        `Error parsing message in draft room ${this.room.id}:`,
        error
      );
      this.sendError(sender, "Invalid message format");
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

  private handleMessage(message: DraftMessage, sender: Party.Connection) {
    switch (message.type) {
      case DraftMessageType.JOIN_ROOM:
        this.handleJoinRoom(message, sender);
        break;

      case DraftMessageType.NOMINATE_PLAYER:
        this.handleNominatePlayer(message, sender);
        break;

      case DraftMessageType.PLACE_BID:
        this.handlePlaceBid(message, sender);
        break;

      case DraftMessageType.START_COUNTDOWN:
        this.handleStartCountdown(message, sender);
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

  private handleNominatePlayer(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    const { playerId, playerName, nominationAmount, teamId } = message.data;

    // Validate nomination
    if (this.state.phase !== "nominating") {
      this.sendError(sender, "Not in nominating phase");
      return;
    }

    if (this.state.currentTurnTeamId !== teamId) {
      this.sendError(sender, "Not your turn to nominate");
      return;
    }

    if (this.state.currentNomination) {
      this.sendError(sender, "Another nomination is in progress");
      return;
    }

    // Create nomination
    const nomination = {
      id: `nom_${Date.now()}`,
      playerId,
      playerName,
      currentBid: nominationAmount,
      highestBidderId: teamId,
      nominatingTeamId: teamId,
      startedAt: Date.now(),
    };

    this.state.currentNomination = nomination;
    this.state.phase = "bidding";
    this.state.bids = [
      {
        id: `bid_${Date.now()}`,
        teamId,
        amount: nominationAmount,
        timestamp: Date.now(),
      },
    ];

    // Broadcast nomination
    this.broadcastMessage({
      type: DraftMessageType.PLAYER_NOMINATED,
      data: {
        nomination,
        bids: this.state.bids,
      },
      timestamp: Date.now(),
    });
  }

  private handlePlaceBid(message: DraftMessage, sender: Party.Connection) {
    const { teamId, amount } = message.data;

    // Validate bid
    if (this.state.phase !== "bidding") {
      this.sendError(sender, "Not in bidding phase");
      return;
    }

    if (!this.state.currentNomination) {
      this.sendError(sender, "No active nomination");
      return;
    }

    if (amount <= this.state.currentNomination.currentBid) {
      this.sendError(sender, "Bid must be higher than current bid");
      return;
    }

    // Clear countdown if active
    if (this.state.countdown?.active) {
      this.clearCountdown();
    }

    // Update nomination and add bid
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
  }

  private handleStartCountdown(
    message: DraftMessage,
    sender: Party.Connection
  ) {
    const { duration = 10000 } = message.data; // Default 10 seconds

    if (this.state.phase !== "bidding") {
      this.sendError(sender, "Can only start countdown during bidding");
      return;
    }

    if (!this.state.currentNomination) {
      this.sendError(sender, "No active nomination");
      return;
    }

    this.startCountdown(duration);
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

  private endCountdown() {
    if (!this.state.currentNomination) {
      return;
    }

    const nomination = this.state.currentNomination;
    this.state.countdown = null;

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
      },
      timestamp: Date.now(),
    });

    // Clear current nomination and reset state
    this.state.currentNomination = null;
    this.state.bids = [];
    this.state.phase = "nominating";

    // Move to next turn (this would be handled by the API)
    // For now, we'll just broadcast the state update
    this.broadcastMessage({
      type: DraftMessageType.DRAFT_STATE_UPDATE,
      data: this.getPublicState(),
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
    return {
      leagueId: this.state.leagueId,
      participants: Array.from(this.state.participants.values()),
      currentNomination: this.state.currentNomination,
      currentTurnTeamId: this.state.currentTurnTeamId,
      countdown: this.state.countdown,
      phase: this.state.phase,
      bids: this.state.bids,
    };
  }
}
