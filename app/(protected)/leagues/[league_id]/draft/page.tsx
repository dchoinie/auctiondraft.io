"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import PartySocket from "partysocket";
import { useAuth } from "@clerk/nextjs";

export default function DraftPage() {
  const { league_id } = useParams();
  const { getToken } = useAuth();

  useEffect(() => {
    async function connectPartySocket() {
      const token = await getToken();
      const partySocket = new PartySocket({
        host: "localhost:1999",
        room: league_id as string,
        query: { token },
      });

      partySocket.send("Hello everyone");
      partySocket.addEventListener("message", (e) => {
        console.log(e.data);
      });
    }
    connectPartySocket();
  }, [league_id, getToken]);

  return <div>Draft</div>;
}
