import { useEffect, useRef } from "react";
import { DraftRoomState, TeamDraftState } from "@/party";
import type PartySocket from "partysocket";
import { useLeagueTeams, Team } from "@/stores/teamStore";
import { League, useLeagueMembership } from "@/stores/leagueStore";
import { useLeagueKeepers } from "@/stores/keepersStore";
import { useDraftedPlayersAuto } from "@/stores/draftedPlayersStore";
import { useDraftStateStore } from "@/stores/draftRoomStore";
import { useDraftedPlayersStore } from "@/stores/draftedPlayersStore";
import { useOfflineTeamStore, OfflineTeam } from "@/stores/offlineTeamStore";

interface UseDraftHydrationProps {
  leagueId: string;
  partySocket: PartySocket | null;
  draftState: DraftRoomState | null;
}

export function useDraftHydration({
  leagueId,
  partySocket,
  draftState,
}: UseDraftHydrationProps) {
  const hasHydrated = useRef(false);
  const setDraftState = useDraftStateStore((state) => state.setDraftState);

  // Return hydration status for the client to use
  const isHydrated =
    hasHydrated.current ||
    (draftState?.draftPhase === "live" &&
      draftState.teams &&
      Object.keys(draftState.teams).length > 0);

  // Helper function to validate draft state completeness
  const isDraftStateComplete = (state: DraftRoomState): boolean => {
    // For hydration purposes, we only need the draft to be live
    // Teams and nomination order will be populated by hydration
    return state.draftPhase === "live";
  };

  // Load draft state from database when entering the draft room
  useEffect(() => {
    async function loadDraftStateFromDB() {
      if (!partySocket || hasHydrated.current) return;

      try {
        console.log("Loading draft state from database...");
        const response = await fetch(`/api/leagues/${leagueId}/draft/state`);
        if (response.ok) {
          const { draftState: savedDraftState } = await response.json();
          
          // Only restore the draft state if the draft was actually in progress
          // Check if there are drafted players or if the draft was actively running
          if (savedDraftState && savedDraftState.draftPhase === "live") {
            // Check if there are actually drafted players or if the draft was actively running
            const hasDraftedPlayers = savedDraftState.totalPicks > 0;
            const hasActiveTeams = savedDraftState.teams && Object.keys(savedDraftState.teams).length > 0;
            
            if (hasDraftedPlayers || hasActiveTeams) {
              console.log("Found active draft state, restoring...", {
                draftPhase: savedDraftState.draftPhase,
                currentRound: savedDraftState.currentRound,
                totalPicks: savedDraftState.totalPicks,
                hasDraftedPlayers,
                hasActiveTeams,
              });

              // Set the draft state locally first
              setDraftState(leagueId, savedDraftState);

              // Send the restored state to PartyKit immediately
              partySocket.send(
                JSON.stringify({ type: "restoreState", data: savedDraftState })
              );

              // Mark as hydrated immediately since we have the state
              hasHydrated.current = true;
            } else {
              console.log("Found saved draft state but no active draft in progress, starting fresh");
              // If there's a saved state but no active draft, don't restore it
              // Mark as hydrated so the draft can start fresh
              hasHydrated.current = true;
            }
          } else {
            console.log("No saved draft state found or draft not started");
            // If no saved state, mark as hydrated so the draft can start
            hasHydrated.current = true;
          }
        }
      } catch (error) {
        console.error("Error loading draft state from database:", error);
        // If there's an error, mark as hydrated so the draft can still start
        hasHydrated.current = true;
      }
    }

    loadDraftStateFromDB();
  }, [leagueId, partySocket]); // Removed setDraftState from dependencies

  // Get all the data we need for hydration
  const { teams, loading: teamsLoading } = useLeagueTeams(leagueId);
  const { leagues, loading: leaguesLoading } = useLeagueMembership();
  const { keepers, loading: keepersLoading } = useLeagueKeepers(leagueId);
  const { teams: offlineTeams, fetchTeams: fetchOfflineTeams } = useOfflineTeamStore();
  const draftedPlayers = useDraftedPlayersAuto(leagueId);
  const draftedPlayersLoading = useDraftedPlayersStore(
    (state) => state.loading[leagueId] ?? false
  );
  const draftedPlayersLoaded = useDraftedPlayersStore(
    (state) => state.loaded[leagueId] ?? false
  );

  // Find the league
  const league = leagues.find((league: League) => league.id === leagueId);
  
  // Check if league is in offline mode
  const isOfflineMode = league?.settings?.draftMode === "offline";

  // Fetch offline teams when in offline mode
  React.useEffect(() => {
    if (isOfflineMode && leagueId) {
      fetchOfflineTeams(leagueId);
    }
  }, [isOfflineMode, leagueId, fetchOfflineTeams]);

  useEffect(() => {
    console.log("Hydration useEffect triggered", {
      teamsLoading,
      leaguesLoading,
      keepersLoading,
      draftedPlayersLoading,
      draftedPlayersLoaded,
      hasPartySocket: !!partySocket,
      hasDraftState: !!draftState,
      teamsCount: teams.length,
      hasLeague: !!league,
      hasHydrated: hasHydrated.current,
      draftedPlayersCount: draftedPlayers.length,
    });

    // Only proceed if we have all required data and a PartyKit connection
    if (
      teamsLoading ||
      leaguesLoading ||
      keepersLoading ||
      draftedPlayersLoading ||
      !partySocket ||
      !draftState ||
      (!teams.length && !offlineTeams.length) ||
      !league ||
      !draftedPlayersLoaded
    ) {
      console.log(
        "Hydration useEffect - missing required data, returning early"
      );
      return;
    }

    // Check if we've already hydrated for this draft state
    if (hasHydrated.current) {
      // Check if teams data is actually present
      const hasTeamsData =
        draftState.teams && Object.keys(draftState.teams).length > 0;
      if (hasTeamsData) {
        console.log("PartyKit: Already hydrated with teams data, skipping");
        return;
      } else {
        console.log(
          "PartyKit: Already hydrated but no teams data found, re-hydrating"
        );
        hasHydrated.current = false;
      }
    }

    // Validate that we have a complete draft state before proceeding
    if (!isDraftStateComplete(draftState)) {
      console.log("PartyKit: Draft state incomplete, skipping hydration", {
        hasTeams:
          !!draftState.teams && Object.keys(draftState.teams).length > 0,
        hasNominationOrder:
          !!draftState.nominationOrder && draftState.nominationOrder.length > 0,
        draftPhase: draftState.draftPhase,
      });
      return;
    }

    // Calculate total roster spots
    const totalRosterSpots =
      (league.settings.qbSlots || 0) +
      (league.settings.rbSlots || 0) +
      (league.settings.wrSlots || 0) +
      (league.settings.teSlots || 0) +
      (league.settings.flexSlots || 0) +
      (league.settings.dstSlots || 0) +
      (league.settings.kSlots || 0) +
      (league.settings.benchSlots || 0);

    console.log("Hydrating draft state with league-specific data", {
      teamsCount: teams.length,
      offlineTeamsCount: offlineTeams.length,
      keepersCount: keepers?.length || 0,
      draftedPlayersCount: draftedPlayers.length,
      totalRosterSpots,
      draftPhase: draftState.draftPhase,
      draftedPlayersSample: draftedPlayers.slice(0, 3), // Show first 3 drafted players
    });

    // Calculate keeper costs by team
    const keeperCostByTeam: Record<string, number> = {};
    (keepers || []).forEach((keeper) => {
      keeperCostByTeam[keeper.teamId] =
        (keeperCostByTeam[keeper.teamId] || 0) + (keeper.keeperPrice || 0);
    });

    console.log("Keeper costs by team:", keeperCostByTeam);

    // Get all teams (live + offline) for offline mode
    const allTeams = isOfflineMode ? [...teams, ...offlineTeams] : teams;

    // Build hydrated teams state
    const hydratedTeams: Record<string, TeamDraftState> = allTeams.reduce(
      (acc, team) => {
        const keeperCost = keeperCostByTeam[team.id] || 0;
        const teamDraftedPlayers = draftedPlayers.filter(
          (p) => p.teamId === team.id
        );
        const draftedCount = teamDraftedPlayers.length;
        const draftedPlayerCosts = teamDraftedPlayers.reduce(
          (sum, player) => sum + (player.draftPrice || 0),
          0
        );
        const remainingBudget = team.budget - keeperCost - draftedPlayerCosts;
        const remainingRosterSpots = totalRosterSpots - draftedCount;

        const teamState = {
          teamId: team.id,
          startingBudget: team.budget,
          totalRosterSpots: totalRosterSpots,
          remainingBudget,
          remainingRosterSpots,
          playersDrafted: teamDraftedPlayers
            .map((p) => {
              // Use the data we already have from the database instead of fetching
              return {
                playerId: p.playerId,
                name: p.playerFirstName + " " + p.playerLastName,
                cost: p.draftPrice,
                position: p.playerPosition || null,
              };
            })
            .filter((p) => p.playerId), // Filter out any invalid players
          maxBid: Math.max(1, remainingBudget - (remainingRosterSpots - 1)),
        };

        console.log(`Hydration - team ${team.name}:`, {
          teamId: team.id,
          budget: team.budget,
          keeperCost,
          draftedCount,
          draftedPlayerCosts,
          remainingBudget,
          remainingRosterSpots,
          maxBid: teamState.maxBid,
          teamDraftedPlayers: teamDraftedPlayers.map((p) => ({
            name: p.playerFirstName + " " + p.playerLastName,
            cost: p.draftPrice,
          })),
        });

        acc[team.id] = teamState;
        return acc;
      },
      {} as Record<string, TeamDraftState>
    );

    console.log("Hydration - final hydrated teams:", {
      teamsCount: Object.keys(hydratedTeams).length,
      teamIds: Object.keys(hydratedTeams),
      sampleTeam: Object.values(hydratedTeams)[0],
    });

    // Calculate total picks made during the draft (excluding keepers)
    // Get keeper player IDs to exclude them from draft pick count
    const keeperPlayerIds = new Set((keepers || []).map((k) => k.playerId));

    // Filter out keeper players from drafted players to get actual draft picks
    const actualDraftPicks = draftedPlayers.filter(
      (dp) => !keeperPlayerIds.has(dp.playerId)
    );
    const totalDraftPicks = actualDraftPicks.length;
    const totalTeams = allTeams.length;
    const currentRound = Math.floor(totalDraftPicks / totalTeams) + 1;
    const currentPick = (totalDraftPicks % totalTeams) + 1;

    // Build nomination order based on team draft order
    const nominationOrder = allTeams
      .sort((a, b) => (a.draftOrder || 0) - (b.draftOrder || 0))
      .map((team: Team | OfflineTeam) => team.id);

    // Calculate the correct current nominator team ID based on currentNominationIndex
    const currentNominatorTeamId =
      nominationOrder[draftState.currentNominationIndex] || null;

    // Calculate snake draft direction for debugging
    const currentRoundFromIndex = Math.floor(
      draftState.currentNominationIndex / totalTeams
    );
    const isReverseRound = currentRoundFromIndex % 2 === 1;
    const positionInRound = draftState.currentNominationIndex % totalTeams;

    console.log("Hydration - nomination details:", {
      currentNominationIndex: draftState.currentNominationIndex,
      nominationOrder,
      currentNominatorTeamId,
      totalTeams,
      currentRound,
      currentPick,
      draftType: draftState.draftType,
      currentRoundFromIndex,
      isReverseRound,
      positionInRound,
      snakeDirection: isReverseRound ? "reverse" : "forward",
    });

    // Build the hydrated draft state
    const hydratedDraftState: DraftRoomState = {
      ...draftState,
      currentNominatorTeamId,
      nominationOrder,
      draftType: (league.settings.draftType as "snake" | "linear") || "linear",
      timerDuration: league.settings.timerDuration ?? 60,
      autoStartTimer: league.settings.timerEnabled === 1,
      currentRound: currentRound,
      currentPick: currentPick,
      totalPicks: totalDraftPicks,
      teams: hydratedTeams,
    };

    // Update local state
    setDraftState(leagueId, hydratedDraftState);

    // Send hydrated state back to PartyKit
    console.log("Sending hydrated state to PartyKit");
    partySocket.send(
      JSON.stringify({ type: "hydrateState", data: hydratedDraftState })
    );

    hasHydrated.current = true;
    console.log(
      "Draft state hydration complete - draft room should now be visible"
    );
  }, [
    leagueId,
    draftState,
    teamsLoading,
    leaguesLoading,
    keepersLoading,
    draftedPlayersLoading,
    draftedPlayersLoaded,
    teams,
    offlineTeams,
    league,
    keepers,
    draftedPlayers,
    partySocket,
    setDraftState,
    isOfflineMode,
  ]);

  // Reset hydration flag when draft state is reset or when draft phase changes
  useEffect(() => {
    if (!draftState || draftState.draftPhase !== "live") {
      hasHydrated.current = false;
    }
  }, [draftState?.draftPhase]);

  return { isHydrated, hasHydratedRef: hasHydrated.current };
}

// Helper hook for draft phase management
export function useDraftPhase(draftState: DraftRoomState | null) {
  const isPreDraft = draftState?.draftPhase === "pre";
  const isLive = draftState?.draftPhase === "live";
  const isPaused = draftState?.draftPhase === "paused";
  const isComplete = draftState?.draftPhase === "complete";
  const isActive = isLive || isPaused; // Draft has been started but not completed

  return {
    isPreDraft,
    isLive,
    isPaused,
    isComplete,
    isActive,
    phase: draftState?.draftPhase || "pre",
  };
}
