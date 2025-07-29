import { useEffect, useRef } from "react";
import { DraftRoomState } from "@/party";
import type PartySocket from "partysocket";
import { useDraftedPlayersStore } from "@/stores/draftedPlayersStore";

interface ExtendedDraftRoomState extends DraftRoomState {
  soldPlayer?: {
    playerId: string;
    teamId: string;
    price: number;
  };
}

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
  const processingSoldRef = useRef(false);
  const lastProcessedSoldPlayerRef = useRef<string | null>(null);

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
              console.log("Client: State update received", {
                previousAuctionPhase: draftState.auctionPhase,
                currentAuctionPhase: message.data.auctionPhase,
                hasSoldPlayerData: !!(message.data as ExtendedDraftRoomState)
                  .soldPlayer,
              });

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

              // Check if a player was just sold by looking for soldPlayer data in the message
              const soldPlayerData = (message.data as ExtendedDraftRoomState)
                .soldPlayer;

              // Enhanced duplicate prevention with player ID tracking
              if (soldPlayerData && !processingSoldRef.current) {
                const soldPlayerId = soldPlayerData.playerId;

                // Check if we've already processed this player
                if (lastProcessedSoldPlayerRef.current === soldPlayerId) {
                  console.log(
                    "Client: Skipping duplicate sold player processing",
                    soldPlayerId
                  );
                  return;
                }

                processingSoldRef.current = true;
                lastProcessedSoldPlayerRef.current = soldPlayerId;

                console.log("Client: Player sold - adding to database", {
                  playerId: soldPlayerData.playerId,
                  teamId: soldPlayerData.teamId,
                  price: soldPlayerData.price,
                });

                // Add the sold player to the database via API
                const requestData = {
                  teamId: soldPlayerData.teamId,
                  playerId: soldPlayerData.playerId,
                  draftPrice: soldPlayerData.price,
                };

                console.log(
                  "Client: Sending addDraftedPlayer request",
                  requestData
                );

                try {
                  const response = await fetch(
                    `/api/leagues/${leagueId}/draft/state`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "addDraftedPlayer",
                        data: requestData,
                      }),
                    }
                  );

                  console.log("Client: API response status:", response.status);

                  if (!response.ok) {
                    const errorData = await response.json();
                    console.error(
                      "Error adding drafted player - API response:",
                      errorData
                    );
                  } else {
                    const responseData = await response.json();
                    console.log(
                      "Successfully added drafted player to database",
                      responseData
                    );

                    // Refetch drafted players to update the UI
                    useDraftedPlayersStore
                      .getState()
                      .fetchDraftedPlayers(leagueId);
                  }
                } catch (error) {
                  console.error("Error adding drafted player:", error);
                }

                // Reset the processing flag after a delay
                setTimeout(() => {
                  processingSoldRef.current = false;
                }, 1000);
              }
            }
            break;

          case "init":
            if (message.data && message.data.draftPhase === "live") {
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
