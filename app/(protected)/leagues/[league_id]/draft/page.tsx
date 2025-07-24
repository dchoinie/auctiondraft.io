"use client";

import React, { useEffect, useState } from "react";
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
} from "@/stores/draftedPlayersStore";
import { usePlayersStore } from "@/stores/playersStore";
import { Loader2 } from "lucide-react";
import { DraftRoomState, TeamDraftState } from "@/party";
import { useDraftStateStore, useDraftState } from "@/stores/draftRoomStore";

export default function DraftPage() {
  const { league_id } = useParams();
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
  const { getToken } = useAuth();
  const {
    keepers,
    loading: keepersLoading,
    error: keepersError,
  } = useLeagueKeepers(league_id as string);
  const draftedPlayers = useDraftedPlayersAuto(league_id as string);
  const draftState = useDraftState(league_id as string);
  const setDraftState = useDraftStateStore((state) => state.setDraftState);
  const [partySocket, setPartySocket] = useState<PartySocket | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const playersStore = usePlayersStore();

  // Use stable selectors for Zustand store methods
  const getPlayerById = usePlayersStore((state) => state.getPlayerById);
  const fetchPlayerById = usePlayersStore((state) => state.fetchPlayerById);
  const playerCache = usePlayersStore((state) => state.playerCache);

  // Helper to get all unique playerIds from draftedPlayers and keepers
  const allDraftedAndKeeperPlayerIds = React.useMemo(() => {
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
  const isDataLoadingError =
    teamsLoading || leaguesLoading || userLoading || keepersLoading;
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

  console.log(draftedPlayers);

  // Connect PartySocket and set up listeners
  useEffect(() => {
    async function connectPartySocket() {
      const token = await getToken();
      const socket = new PartySocket({
        host: "localhost:1999",
        room: league_id as string,
        query: { token },
      });
      setPartySocket(socket);

      socket.send("Hello everyone");
      socket.addEventListener("message", (e) => {
        let rawData = e.data;
        if (rawData instanceof ArrayBuffer) {
          rawData = new TextDecoder().decode(rawData);
        }
        const message = JSON.parse(rawData as string);

        if (message.type === "init") {
          // Only set state if it's not the empty default
          if (message.data && Object.keys(message.data.teams).length > 0) {
            setDraftState(league_id as string, message.data);
          }
        }
        // Listen for a real-time state update (e.g., after 'startDraft')
        if (message.type === "stateUpdate" && message.data) {
          setDraftState(league_id as string, message.data);
        }
        // Optionally, handle a specific 'draftStarted' event
        if (message.type === "draftStarted" && message.data) {
          setDraftState(league_id as string, message.data);
        }
      });
    }
    connectPartySocket();
  }, [league_id, getToken, setDraftState]);

  // Check if all data is loaded and ready
  const isAllDataReady = React.useMemo(() => {
    // Check if all required data is loaded
    const basicDataReady =
      teams.length > 0 && // teams must be loaded for a valid draft
      league?.settings && // ensure we have league settings
      totalRosterSpots > 0 && // ensure we have a valid roster size
      !teamsLoading && // ensure teams are not still loading
      !leaguesLoading && // ensure leagues are not still loading
      !keepersLoading; // ensure keepers are not still loading

    if (!basicDataReady) return false;

    // Check if all drafted and keeper players have their data loaded
    const allPlayerIds = allDraftedAndKeeperPlayerIds;
    const allPlayersLoaded = allPlayerIds.every(
      (playerId) => getPlayerById(playerId) !== undefined
    );

    return allPlayersLoaded;
  }, [
    teams.length,
    league?.settings,
    totalRosterSpots,
    teamsLoading,
    leaguesLoading,
    keepersLoading,
    allDraftedAndKeeperPlayerIds,
    getPlayerById,
  ]);

  // Send init message only once when all data is loaded and stable
  useEffect(() => {
    if (!hasInitialized && partySocket && isAllDataReady) {
      // Build the draft state locally (same logic as in your message handler)
      const keeperCostByTeam: Record<string, number> = {};
      (keepers || []).forEach((keeper) => {
        keeperCostByTeam[keeper.teamId] =
          (keeperCostByTeam[keeper.teamId] || 0) + (keeper.keeperPrice || 0);
      });

      const newDraftState = {
        draftStarted: false,
        currentNominatorTeamId:
          teams.find((team: Team) => team.draftOrder === 1)?.id || null,
        nominatedPlayer: null,
        startingBidAmount: 0,
        currentBid: null,
        bidTimer: league?.settings.timerEnabled ?? 0,
        bidTimerExpiresAt: null,
        auctionPhase: "idle" as const,
        nominationOrder: teams
          .sort((a, b) => (a.draftOrder || 0) - (b.draftOrder || 0))
          .map((team: Team) => team.id),
        currentNominationIndex: 0,
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

      partySocket.send(JSON.stringify({ type: "init", data: newDraftState }));
      setHasInitialized(true);
    }
  }, [hasInitialized, partySocket, isAllDataReady]);

  // Handler for Start Draft button
  const handleStartDraft = () => {
    if (partySocket) {
      partySocket.send(JSON.stringify({ type: "startDraft" }));
    }
  };

  if (isLoadingData)
    return (
      <div className="flex justify-center items-center h-screen text-white">
        <Loader2 className="animate-spin mr-2" /> Loading data...
      </div>
    );
  if (isDataLoadingError)
    return (
      <div>
        Error:{" "}
        {[teamsError, leaguesError, userError, keepersError]
          .map((err) => {
            if (!err) return null;
            if (typeof err === "string") return err;
            // If it's an object (e.g., Record<string, string | null>), join its values
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
    <div>
      {/* Start Draft Button */}
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
          onClick={handleStartDraft}
          disabled={draftState?.draftStarted}
        >
          Start Draft
        </button>
      </div>
      {draftState ? (
        <pre className="text-white">{JSON.stringify(draftState, null, 2)}</pre>
      ) : (
        <p className="text-white">Waiting for server state...</p>
      )}
    </div>
  );
}
