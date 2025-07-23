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
import { Loader2 } from "lucide-react";
import Controls from "@/components/draft/Controls";
import { DraftRoomState, TeamDraftState } from "@/party";

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
  const [draftState, setDraftState] = useState<DraftRoomState | null>(null);

  const league = leagues.find((league: League) => league.id === league_id);
  const isDataLoadingError =
    teamsLoading || leaguesLoading || userLoading || keepersLoading;
  const isLoadingData =
    teamsLoading || leaguesLoading || userLoading || keepersLoading;
  const totalRosterSpots =
    (league?.settings.qbSlots ?? 0) +
    (league?.settings.rbSlots ?? 0) +
    (league?.settings.wrSlots ?? 0) +
    (league?.settings.teSlots ?? 0) +
    (league?.settings.flexSlots ?? 0) +
    (league?.settings.dstSlots ?? 0) +
    (league?.settings.kSlots ?? 0) +
    (league?.settings.benchSlots ?? 0);

  console.log(draftedPlayers);

  useEffect(() => {
    async function connectPartySocket() {
      const token = await getToken();
      const partySocket = new PartySocket({
        host: "localhost:1999",
        room: league_id as string,
        query: { token },
      });

      partySocket.send("Hello everyone");
      partySocket.send(JSON.stringify({ type: "init", data: draftState }));
      partySocket.addEventListener("message", (e) => {
        let rawData = e.data;

        if (rawData instanceof ArrayBuffer) {
          rawData = new TextDecoder().decode(rawData);
        }

        const message = JSON.parse(rawData as string);

        if (message.type === "init") {
          console.log("Received initial state:", message.data);

          // Build keeper cost map
          const keeperCostByTeam: Record<string, number> = {};
          (keepers || []).forEach((keeper) => {
            keeperCostByTeam[keeper.teamId] =
              (keeperCostByTeam[keeper.teamId] || 0) +
              (keeper.keeperPrice || 0);
          });

          setDraftState({
            draftStarted: false,
            currentNominatorTeamId:
              teams.find((team: Team) => team.draftOrder === 1)?.id || null,
            nominatedPlayer: null,
            startingBidAmount: 1,
            currentBid: null,
            bidTimer: league?.settings.timerEnabled ?? 0,
            bidTimerExpiresAt: null,
            auctionPhase: "idle",
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
                    .map((p: DraftedPlayer) => ({
                      playerId: p.playerId,
                      name: p.playerFirstName + " " + p.playerLastName,
                      cost: p.draftPrice,
                    })),
                  maxBid: remainingBudget - (remainingRosterSpots - 1),
                };
                return acc;
              },
              {} as Record<string, TeamDraftState>
            ),
          });
        }
      });
    }
    connectPartySocket();
  }, [league_id, getToken, draftedPlayers, teams, keepers, totalRosterSpots]);

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
      {/* <Controls leagueId={league_id as string} sendAdminAction={() => {}} /> */}
      {draftState ? (
        <pre className="text-white">{JSON.stringify(draftState, null, 2)}</pre>
      ) : (
        <p className="text-white">Waiting for server state...</p>
      )}
    </div>
  );
}
