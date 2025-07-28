"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import PartySocket from "partysocket";
import { useAuth } from "@clerk/nextjs";
import { useLeagueTeams, Team } from "@/stores/teamStore";
import { useUser } from "@/stores/userStore";
import { League, useLeagueMembership } from "@/stores/leagueStore";
import { useLeagueKeepers } from "@/stores/keepersStore";
import {
  DraftedPlayer,
  useDraftedPlayersAuto,
  useDraftedPlayersStore,
} from "@/stores/draftedPlayersStore";
import { usePlayersStore } from "@/stores/playersStore";
import { Loader2 } from "lucide-react";
import { DraftRoomState, TeamDraftState } from "@/party";
import { useDraftStateStore, useDraftState } from "@/stores/draftRoomStore";
import { useDraftDatabase } from "@/hooks/use-draft-database";
import AdminControls from "@/components/draft/AdminControls";
import TeamTracker from "@/components/draft/TeamTracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Rosters from "@/components/draft/Rosters";
import PlayersTable from "@/components/draft/PlayersTable";
import AuctionStage from "@/components/draft/AutionStage";
import Countdown from "@/components/draft/Countdown";
import RoundCounter from "@/components/draft/RoundCounter";

export default function DraftPage() {
  const { league_id } = useParams();
  const { getToken } = useAuth();
  const [partySocket, setPartySocket] = useState<PartySocket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("draft");
  const [awaitingInitConfirmation, setAwaitingInitConfirmation] =
    useState(false);

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
  const {
    keepers,
    loading: keepersLoading,
    error: keepersError,
  } = useLeagueKeepers(league_id as string);
  const draftedPlayers = useDraftedPlayersAuto(league_id as string);
  const draftState = useDraftState(league_id as string);
  const setDraftState = useDraftStateStore((state) => state.setDraftState);

  // Handle database operations based on PartyKit messages
  useDraftDatabase({
    leagueId: league_id as string,
    partySocket,
    draftState,
  });

  const playersStore = usePlayersStore();
  // Use stable selectors for Zustand store methods
  const getPlayerById = usePlayersStore((state) => state.getPlayerById);
  const fetchPlayerById = usePlayersStore((state) => state.fetchPlayerById);

  // Helper to get all unique playerIds from draftedPlayers and keepers
  const allDraftedAndKeeperPlayerIds = useMemo(() => {
    const draftedIds = draftedPlayers.map((p) => p.playerId);
    const keeperIds = (keepers || []).map((k) => k.playerId);
    return Array.from(new Set([...draftedIds, ...keeperIds]));
  }, [draftedPlayers, keepers]);

  // Fetch player data for all drafted/keeper playerIds if not already cached
  useEffect(() => {
    async function fetchMissingPlayers() {
      const missingIds = allDraftedAndKeeperPlayerIds.filter(
        (id) => !getPlayerById(id)
      );
      await Promise.all(missingIds.map((id) => fetchPlayerById(id)));
    }
    if (allDraftedAndKeeperPlayerIds.length > 0) {
      fetchMissingPlayers();
    }
  }, [allDraftedAndKeeperPlayerIds, getPlayerById, fetchPlayerById]);

  const league = leagues.find((league: League) => league.id === league_id);
  const isDataError = teamsError || leaguesError || userError || keepersError;
  const isLoadingData =
    teamsLoading || leaguesLoading || userLoading || keepersLoading;

  // Only calculate totalRosterSpots when we have the league settings
  const totalRosterSpots = league?.settings
    ? (league.settings.qbSlots || 0) +
      (league.settings.rbSlots || 0) +
      (league.settings.wrSlots || 0) +
      (league.settings.teSlots || 0) +
      (league.settings.flexSlots || 0) +
      (league.settings.dstSlots || 0) +
      (league.settings.kSlots || 0) +
      (league.settings.benchSlots || 0)
    : 0;

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
        socket.addEventListener("message", (e) => {
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
            }

            if (message.type === "stateUpdate" && message.data) {
              setDraftState(league_id as string, message.data);
            }
            if (message.type === "draftStarted" && message.data) {
              setDraftState(league_id as string, message.data);
            }
            if (message.type === "draftPaused" && message.data) {
              setDraftState(league_id as string, message.data);
            }
            if (
              message.type === "connectedUsers" &&
              Array.isArray(message.userIds)
            ) {
              setOnlineUserIds(message.userIds);
            }
            if (message.type === "draftReset") {
              setDraftState(league_id as string, null);
              useDraftedPlayersStore
                .getState()
                .resetLeague(league_id as string);
            }

            // Handle init message
            if (message.type === "init" && message.data) {
              setDraftState(league_id as string, message.data);
            }

            // If this is a state update after a player was sold (no nominated player), refresh drafted players
            if (
              message.type === "stateUpdate" &&
              message.data &&
              !message.data.nominatedPlayer &&
              message.data.auctionPhase === "idle"
            ) {
              // Refresh drafted players from database
              useDraftedPlayersStore
                .getState()
                .fetchDraftedPlayers(league_id as string);
            }

            // Awaiting init confirmation: send startDraft after state is hydrated
            if (
              awaitingInitConfirmation &&
              (message.type === "stateUpdate" || message.type === "init") &&
              message.data &&
              message.data.teams &&
              Object.keys(message.data.teams).length > 0
            ) {
              socket?.send(JSON.stringify({ type: "startDraft" }));
              setAwaitingInitConfirmation(false);
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

  // Store the draft state to send on start
  const buildInitialDraftState = () => {
    const keeperCostByTeam: Record<string, number> = {};
    (keepers || []).forEach((keeper) => {
      keeperCostByTeam[keeper.teamId] =
        (keeperCostByTeam[keeper.teamId] || 0) + (keeper.keeperPrice || 0);
    });
    return {
      draftStarted: false,
      currentNominatorTeamId:
        teams.find((team: Team) => team.draftOrder === 1)?.id || null,
      nominatedPlayer: null,
      startingBidAmount: 0,
      currentBid: null,
      bidTimer: league?.settings.timerEnabled ?? 0,
      timerDuration: league?.settings.timerDuration ?? 4,
      autoStartTimer: league?.settings.timerEnabled ?? false,
      currentRound: 1,
      currentPick: 1,
      totalPicks: 0,
      draftPaused: false,
      bidTimerExpiresAt: null,
      auctionPhase: "idle" as const,
      nominationOrder: teams
        .sort((a, b) => (a.draftOrder || 0) - (b.draftOrder || 0))
        .map((team: Team) => team.id),
      currentNominationIndex: 0,
      draftType: (league?.settings.draftType as "snake" | "linear") || "linear",
      teams: teams.reduce(
        (acc, team) => {
          const keeperCost = keeperCostByTeam[team.id] || 0;
          const draftedCount = draftedPlayers.filter(
            (p: DraftedPlayer) => p.teamId === team.id
          ).length;
          const remainingBudget = team.budget - keeperCost;
          const remainingRosterSpots = totalRosterSpots - draftedCount;
          acc[team.id] = {
            teamId: team.id,
            startingBudget: team.budget,
            totalRosterSpots: totalRosterSpots,
            remainingBudget,
            remainingRosterSpots,
            playersDrafted: draftedPlayers
              .filter((p: DraftedPlayer) => p.teamId === team.id)
              .map((p: DraftedPlayer) => {
                const player = playersStore.getPlayerById(p.playerId);
                return {
                  playerId: p.playerId,
                  name: p.playerFirstName + " " + p.playerLastName,
                  cost: p.draftPrice,
                  position: player?.position ?? null,
                };
              }),
            maxBid: remainingBudget - (remainingRosterSpots - 1),
          };
          return acc;
        },
        {} as Record<string, TeamDraftState>
      ),
    };
  };

  // Only send 'init' when Start Draft is clicked
  const handleStartDraft = (): void => {
    if (partySocket) {
      const newDraftState = buildInitialDraftState();
      setAwaitingInitConfirmation(true);
      partySocket.send(JSON.stringify({ type: "init", data: newDraftState }));
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
  const handleResetDraft = () => {
    if (partySocket) {
      partySocket.send(JSON.stringify({ type: "resetDraft" }));
    }
  };

  // Show waiting message if draft hasn't started
  if (!draftState?.draftStarted) {
    return (
      <>
        {isAdmin && (
          <AdminControls
            draftState={draftState as DraftRoomState}
            handleStartDraft={handleStartDraft}
            handlePauseDraft={handlePauseDraft}
            handleResetDraft={handleResetDraft}
            handleResumeDraft={handleResumeDraft}
          />
        )}
        <div className="flex flex-col items-center justify-center h-screen text-emerald-200">
          <div className="text-2xl font-bold mb-4">
            Waiting for draft to start...
          </div>
          <div className="text-sm mt-4">
            The draft will begin once the admin clicks Start Draft.
          </div>
        </div>
      </>
    );
  }

  if (isLoadingData)
    return (
      <div className="flex justify-center items-center h-screen text-white">
        <Loader2 className="animate-spin mr-2" /> Setting up draft...
      </div>
    );
  if (isDataError)
    return (
      <div>
        Error:{" "}
        {[teamsError, leaguesError, userError, keepersError]
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
    );

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
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
      {/* Countdown popup overlay */}
      <Countdown
        auctionPhase={draftState?.auctionPhase || "idle"}
        timerDuration={draftState?.timerDuration || 4}
      />

      {/* Round Counter */}
      {draftState?.draftStarted && (
        <div className="mb-6">
          <RoundCounter
            currentRound={draftState.currentRound || 1}
            currentPick={draftState.currentPick || 1}
            totalPicks={draftState.totalPicks || 0}
            totalTeams={teams.length}
          />
        </div>
      )}

      <div className="my-6">
        <AuctionStage
          draftState={draftState as DraftRoomState}
          teams={teams as Team[]}
          partySocket={partySocket}
          user={user}
        />
      </div>
      <div className="my-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex justify-center my-6">
            <TabsList className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl text-emerald-300">
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="rosters">Rosters</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="draft">
            <div className="grid grid-cols-3 gap-12">
              <TeamTracker
                draftState={draftState as DraftRoomState}
                teams={teams as Team[]}
                onlineUserIds={onlineUserIds}
              />
              <div className="col-span-2">
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
    </>
  );
}
