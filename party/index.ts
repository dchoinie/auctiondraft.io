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
  };

  constructor(readonly room: Party.Room) {}

  onRequest(request: Party.Request) {
    return new Response("PartyKit HTTP endpoint is running!", { status: 200 });
  }

  onConnect(conn: Party.Connection, { request }: Party.ConnectionContext) {
    const userId = request.headers.get("X-User-ID");
    conn.send(JSON.stringify({ type: "welcome", userId }));
    conn.send(JSON.stringify({ type: "init", data: this.state }));

    conn.addEventListener("message", (event) => {
      let rawData = event.data;
      if (rawData instanceof ArrayBuffer) {
        rawData = new TextDecoder().decode(rawData);
      }
      const message = JSON.parse(rawData as string);

      switch (message.type) {
        case "init":
          this.state = message.data;
          console.log("init", this.state);
          this.room.broadcast(
            JSON.stringify({ type: "stateUpdate", data: this.state })
          );
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
        default:
          conn.send(JSON.stringify({ echo: message }));
          break;
      }
    });
  }
}

export default PartyRoom;
