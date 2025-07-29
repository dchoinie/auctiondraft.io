"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import PartySocket from "partysocket";
import { useAuth } from "@clerk/nextjs";
import { useLeagueTeams, Team } from "@/stores/teamStore";
import { useUser } from "@/stores/userStore";
import { League, useLeagueMembership } from "@/stores/leagueStore";
import { useDraftedPlayersStore } from "@/stores/draftedPlayersStore";
import { usePlayersStore } from "@/stores/playersStore";
import { Loader2 } from "lucide-react";
import { DraftRoomState } from "@/party";
import { useDraftStateStore, useDraftState } from "@/stores/draftRoomStore";
import { useDraftDatabase } from "@/hooks/use-draft-database";
import { useDraftHydration, useDraftPhase } from "@/hooks/use-draft-hydration";
import AdminControls from "@/components/draft/AdminControls";
import TeamTracker from "@/components/draft/TeamTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Rosters from "@/components/draft/Rosters";
import PlayersTable from "@/components/draft/PlayersTable";
import AuctionStage from "@/components/draft/AuctionStage";
import Countdown from "@/components/draft/Countdown";
import {
  PageContent,
  StaggeredContent,
  StaggeredItem,
  FadeIn,
  SlideUp,
} from "@/components/ui/page-transition";

export default function DraftPage() {
  const { league_id } = useParams();
  const { getToken } = useAuth();
  const [partySocket, setPartySocket] = useState<PartySocket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("draft");
  const lastProcessedStateRef = useRef<string | null>(null);

  // db selectors
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
  } = useLeagueTeams(league_id as string);
  const { user, loading: userLoading, error: userError } = useUser();
  const {
    leagues,
    loading: leaguesLoading,
    error: leaguesError,
  } = useLeagueMembership();
  const draftState = useDraftState(league_id as string);
  const setDraftState = useDraftStateStore((state) => state.setDraftState);

  // Handle database operations based on PartyKit messages
  useDraftDatabase({
    leagueId: league_id as string,
    partySocket,
    draftState,
  });

  // Handle draft state hydration with league-specific data
  const { isHydrated, hasHydratedRef } = useDraftHydration({
    leagueId: league_id as string,
    partySocket,
    draftState,
  });

  // Use the new draft phase hook for cleaner state management
  const { isPreDraft, isLive, isPaused, isComplete, isActive } =
    useDraftPhase(draftState);

  const playersStore = usePlayersStore();

  const league = leagues.find((league: League) => league.id === league_id);
  const isDataError = teamsError || leaguesError || userError;
  const isLoadingData = teamsLoading || leaguesLoading || userLoading;

  // Connect PartySocket and set up listeners
  useEffect(() => {
    let socket: PartySocket | null = null;

    async function connectPartySocket() {
      try {
        const token = await getToken();

        socket = new PartySocket({
          host: "localhost:1999",
          party: "draft",
          room: league_id as string,
          query: { token },
        });

        socket.addEventListener("close", (event) => {
          setPartySocket(null);
        });

        socket.addEventListener("open", () => {
          setPartySocket(socket);
        });

        // Set up message listener
        socket.addEventListener("message", async (e) => {
          let rawData = e.data;
          if (rawData instanceof ArrayBuffer) {
            rawData = new TextDecoder().decode(rawData);
          }

          try {
            const message = JSON.parse(rawData as string);

            if (message.type === "authError") {
              socket?.close();
              return;
            }

            if (message.type === "welcome") {
              // Welcome message received
            }

            if (message.type === "stateUpdate" && message.data) {
              // Create a hash of the state to detect duplicates
              const stateHash = JSON.stringify({
                auctionPhase: message.data.auctionPhase,
                nominatedPlayer: message.data.nominatedPlayer?.id,
                currentBid: message.data.currentBid,
                currentRound: message.data.currentRound,
                currentPick: message.data.currentPick,
                totalPicks: message.data.totalPicks,
                soldPlayer: message.data.soldPlayer,
              });

              // Skip if this is a duplicate state update
              if (lastProcessedStateRef.current === stateHash) {
                console.log("Skipping duplicate state update");
                return;
              }

              lastProcessedStateRef.current = stateHash;
              setDraftState(league_id as string, message.data);
            }

            if (message.type === "draftStarted" && message.data) {
              setDraftState(league_id as string, message.data);

              // Save the started draft state to database
              try {
                await fetch(`/api/leagues/${league_id}/draft/state`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "saveSnapshot",
                    data: {
                      draftState: message.data,
                      eventType: "draftStarted",
                      eventData: { startedBy: user?.id },
                    },
                  }),
                });
                console.log("Draft started - state saved to database");
              } catch (error) {
                console.error(
                  "Error saving draft started state to database:",
                  error
                );
              }
            }

            if (message.type === "draftPaused" && message.data) {
              setDraftState(league_id as string, message.data);
            }

            if (message.type === "draftReset") {
              setDraftState(league_id as string, null);
              useDraftedPlayersStore
                .getState()
                .resetLeague(league_id as string);
            }

            if (
              message.type === "connectedUsers" &&
              Array.isArray(message.userIds)
            ) {
              setOnlineUserIds(message.userIds);
            }

            // Handle init message
            if (message.type === "init" && message.data) {
              setDraftState(league_id as string, message.data);
            }

            // Check for player sold (no nominated player + idle phase)
            // This is now more reliable since server handles state transitions better
            if (
              message.type === "stateUpdate" &&
              message.data &&
              !message.data.nominatedPlayer &&
              message.data.auctionPhase === "idle" &&
              draftState?.nominatedPlayer && // Only refresh if there was a nominated player before
              message.data.soldPlayer // Only refresh if there's sold player data
            ) {
              // Refresh drafted players from database
              useDraftedPlayersStore
                .getState()
                .fetchDraftedPlayers(league_id as string);
            }
          } catch (error) {
            console.error("Error parsing PartyKit message:", error);
          }
        });
      } catch (error) {
        console.error("Error connecting to PartyKit:", error);
      }
    }

    connectPartySocket();

    // Cleanup function
    return () => {
      if (socket) {
        socket.close();
        setPartySocket(null);
      }
    };
  }, [league_id]); // Only depend on league_id to prevent re-runs

  // Send 'startDraft' when Start Draft is clicked
  const handleStartDraft = async (): Promise<void> => {
    console.log("Start Draft button clicked");

    if (!partySocket) {
      console.error("PartySocket not connected");
      return;
    }

    try {
      console.log("Sending startDraft message to PartyKit");
      partySocket.send(JSON.stringify({ type: "startDraft" }));

      // Note: The draft state will be saved to database when PartyKit sends the stateUpdate message
      // This ensures we save the actual updated state from PartyKit
    } catch (error) {
      console.error("Error starting draft:", error);
    }
  };

  const handlePauseDraft = (): void => {
    if (partySocket) {
      partySocket.send(JSON.stringify({ type: "pauseDraft" }));
    }
  };

  const handleResumeDraft = (): void => {
    if (partySocket) {
      partySocket.send(JSON.stringify({ type: "resumeDraft" }));
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Determine if current user is admin (league owner)
  const isAdmin = !!(user && league && user.id === league.ownerId);

  // Handler to send resetDraft event
  const handleResetDraft = async () => {
    if (partySocket) {
      partySocket.send(JSON.stringify({ type: "resetDraft" }));

      // Clear all draft data from database
      try {
        // Clear drafted players (but preserve keepers)
        await fetch(`/api/leagues/${league_id}/draft/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "clearDraftedPlayers",
            data: {},
          }),
        });

        // Clear all draft state history
        await fetch(`/api/leagues/${league_id}/draft/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "clearDraftStateHistory",
            data: {},
          }),
        });

        // Save initial draft state to database after reset
        const initialDraftState = {
          draftPhase: "pre" as const,
          currentNominatorTeamId: null,
          nominatedPlayer: null,
          startingBidAmount: 0,
          currentBid: null,
          bidTimer: null,
          bidTimerExpiresAt: null,
          auctionPhase: "idle" as const,
          nominationOrder: [],
          currentNominationIndex: 0,
          draftType: "linear" as const,
          timerEnabled: false,
          timerDuration: 60,
          autoStartTimer: true,
          currentRound: 1,
          currentPick: 1,
          totalPicks: 0,
          teams: {},
          bidHistory: [],
        };

        await fetch(`/api/leagues/${league_id}/draft/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveSnapshot",
            data: {
              draftState: initialDraftState,
              eventType: "draftReset",
              eventData: { resetBy: user?.id },
            },
          }),
        });

        // Reset drafted players store after a small delay to ensure database operations complete
        setTimeout(() => {
          useDraftedPlayersStore.getState().resetLeague(league_id as string);
        }, 100);

        console.log(
          "Draft completely reset - all data cleared and initial state saved"
        );
      } catch (error) {
        console.error("Error resetting draft state in database:", error);
      }
    }
  };

  // Debug logging for draft state
  console.log("Draft page state:", {
    draftPhase: draftState?.draftPhase,
    isHydrated,
    hasDraftState: !!draftState,
    hasHydratedRef,
    teamsCount: draftState?.teams ? Object.keys(draftState.teams).length : 0,
  });

  // Show waiting message if draft hasn't started or hydration isn't complete
  if (!isLive || !isHydrated) {
    return (
      <PageContent>
        <StaggeredContent>
          <StaggeredItem>
            {isAdmin && (
              <div className="px-4 sm:px-6 lg:px-8">
                <AdminControls
                  draftState={draftState as DraftRoomState}
                  handleStartDraft={handleStartDraft}
                  handlePauseDraft={handlePauseDraft}
                  handleResetDraft={handleResetDraft}
                  handleResumeDraft={handleResumeDraft}
                />
              </div>
            )}
          </StaggeredItem>
          <StaggeredItem>
            <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] lg:min-h-screen text-emerald-200 px-4">
              <SlideUp delay={0.2}>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-center">
                  {isPreDraft
                    ? "Waiting for draft to start..."
                    : isPaused
                      ? "Draft is paused..."
                      : "Setting up draft room..."}
                </div>
              </SlideUp>
              <FadeIn delay={0.4}>
                <div className="text-sm sm:text-base mt-4 text-center max-w-md">
                  {isPreDraft
                    ? "The draft will begin once the admin clicks Start Draft."
                    : isPaused
                      ? "The draft has been paused. Click Resume to continue."
                      : "Loading league data and preparing draft room..."}
                </div>
              </FadeIn>
              {league?.isDraftStarted && isPreDraft && (
                <FadeIn delay={0.6}>
                  <div className="text-sm mt-2 text-yellow-300 text-center">
                    Draft was previously started. Attempting to restore state...
                  </div>
                </FadeIn>
              )}
              {draftState && isPreDraft && (
                <FadeIn delay={0.8}>
                  <div className="text-sm mt-2 text-blue-300 text-center">
                    Draft is ready to start. Click &ldquo;Start Draft&rdquo; to
                    begin.
                  </div>
                </FadeIn>
              )}
            </div>
          </StaggeredItem>
        </StaggeredContent>
      </PageContent>
    );
  }

  if (isLoadingData)
    return (
      <PageContent>
        <div className="flex justify-center items-center min-h-[50vh] sm:min-h-[60vh] lg:min-h-screen text-white px-4">
          <Loader2 className="animate-spin mr-2" /> Setting up draft...
        </div>
      </PageContent>
    );
  if (isDataError)
    return (
      <PageContent>
        <div className="px-4 sm:px-6 lg:px-8">
          Error:{" "}
          {[teamsError, leaguesError, userError]
            .map((err) => {
              if (!err) return null;
              if (typeof err === "string") return err;
              if (typeof err === "object") {
                return Object.values(err).filter(Boolean).join(", ");
              }
              return String(err);
            })
            .filter(Boolean)
            .join(" | ")}
        </div>
      </PageContent>
    );

  return (
    <PageContent>
      <StaggeredContent>
        <StaggeredItem>
          <div className="flex justify-between items-center mb-4 px-4 sm:px-6 lg:px-8">
            <div className="w-full">
              {isAdmin && (
                <AdminControls
                  draftState={draftState as DraftRoomState}
                  handleStartDraft={handleStartDraft}
                  handlePauseDraft={handlePauseDraft}
                  handleResetDraft={handleResetDraft}
                  handleResumeDraft={handleResumeDraft}
                />
              )}
            </div>
          </div>
        </StaggeredItem>

        {/* Countdown popup overlay */}
        <StaggeredItem>
          <Countdown
            auctionPhase={draftState?.auctionPhase || "idle"}
            timerDuration={4} // Fixed 4 seconds for auction countdown
          />
        </StaggeredItem>

        <StaggeredItem>
          <div className="my-4 sm:my-6 px-4 sm:px-6 lg:px-8">
            <AuctionStage
              draftState={draftState as DraftRoomState}
              teams={teams as Team[]}
              partySocket={partySocket}
              user={user}
            />
          </div>
        </StaggeredItem>

        <StaggeredItem>
          <div className="my-4 sm:my-6 px-4 sm:px-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex justify-center my-4 sm:my-6">
                <TabsList className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl text-emerald-300 w-full max-w-xs sm:max-w-md">
                  <TabsTrigger
                    value="draft"
                    className="flex-1 text-sm sm:text-base"
                  >
                    Draft
                  </TabsTrigger>
                  <TabsTrigger
                    value="rosters"
                    className="flex-1 text-sm sm:text-base"
                  >
                    Rosters
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="draft">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-12">
                  <div className="lg:col-span-1 order-2 lg:order-1">
                    <TeamTracker
                      draftState={draftState as DraftRoomState}
                      teams={teams as Team[]}
                      onlineUserIds={onlineUserIds}
                    />
                  </div>
                  <div className="lg:col-span-2 order-1 lg:order-2">
                    <PlayersTable
                      leagueId={league_id as string}
                      partySocket={partySocket}
                      user={user}
                      teams={teams as Team[]}
                      draftState={draftState as DraftRoomState}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="rosters">
                <Rosters />
              </TabsContent>
            </Tabs>
          </div>
        </StaggeredItem>
      </StaggeredContent>
    </PageContent>
  );
}
