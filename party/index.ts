import type * as Party from "partykit/server";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

class PartyRoom implements Party.Server {
  static async onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      if (!token) throw new Error("No token provided");
      // Create a Request with Authorization header for Clerk
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

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, { request }: Party.ConnectionContext) {
    const userId = request.headers.get("X-User-ID");
    conn.send(`Welcome to the party, user ${userId}!`);
    conn.addEventListener("message", (event) => {
      conn.send(`You said: ${event.data}`);
    });
  }
}

export default PartyRoom;
