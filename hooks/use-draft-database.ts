import { useEffect } from "react";
import { DraftRoomState } from "@/party";
import type PartySocket from "partysocket";

interface UseDraftDatabaseProps {
  leagueId: string;
  partySocket: PartySocket | null;
  draftState: DraftRoomState | null;
}

export function useDraftDatabase({
  leagueId,
  partySocket,
  draftState,
}: UseDraftDatabaseProps) {
  useEffect(() => {
    if (!partySocket) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "draftReset":
            console.log("Client: Handling draft reset - clearing database");
            // Clear drafted players and keepers via API
            try {
              await fetch(`/api/leagues/${leagueId}/draft/state`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clearDraftData" }),
              });
            } catch (error) {
              console.error("Error clearing draft data:", error);
            }
            break;

          case "stateUpdate":
            if (message.data && draftState) {
              // Save state update to database for persistence
              try {
                await fetch(`/api/leagues/${leagueId}/draft/state`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "saveSnapshot",
                    data: {
                      draftState: message.data,
                      eventType: "stateUpdate",
                      eventData: {
                        auctionPhase: message.data.auctionPhase,
                        nominatedPlayer:
                          message.data.nominatedPlayer?.id || null,
                        currentBid: message.data.currentBid,
                      },
                    },
                  }),
                });
              } catch (error) {
                console.error("Error saving state update to database:", error);
              }

              // Check if a player was just sold (auction phase changed from active to idle)
              const previousAuctionPhase = draftState.auctionPhase;
              const currentAuctionPhase = message.data.auctionPhase;
              const previousNominatedPlayer = draftState.nominatedPlayer;
              const currentNominatedPlayer = message.data.nominatedPlayer;

              // If auction phase changed from active to idle and nominated player is null, player was sold
              if (
                (previousAuctionPhase === "goingOnce" ||
                  previousAuctionPhase === "goingTwice" ||
                  previousAuctionPhase === "sold") &&
                currentAuctionPhase === "idle" &&
                previousNominatedPlayer &&
                !currentNominatedPlayer &&
                draftState.currentBid
              ) {
                console.log("Client: Player sold - adding to database", {
                  playerId: previousNominatedPlayer.id,
                  teamId: draftState.currentBid.teamId,
                  price: draftState.currentBid.amount,
                });

                // Add the sold player to the database via API
                try {
                  await fetch(`/api/leagues/${leagueId}/draft/state`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "addDraftedPlayer",
                      data: {
                        teamId: draftState.currentBid.teamId,
                        playerId: previousNominatedPlayer.id,
                        draftPrice: draftState.currentBid.amount,
                      },
                    }),
                  });
                } catch (error) {
                  console.error("Error adding drafted player:", error);
                }
              }
            }
            break;

          case "init":
            if (message.data && message.data.draftStarted) {
              console.log(
                "Client: Draft initialized - saving state to database"
              );
              // The draft state is already being managed by the draft state store
              // No additional database operations needed here
            }
            break;

          default:
            // Handle other message types if needed
            break;
        }
      } catch (error) {
        console.error(
          "Error handling PartyKit message for database operations:",
          error
        );
      }
    };

    partySocket.addEventListener("message", handleMessage);

    return () => {
      partySocket.removeEventListener("message", handleMessage);
    };
  }, [partySocket, draftState, leagueId]);

  return null;
}
