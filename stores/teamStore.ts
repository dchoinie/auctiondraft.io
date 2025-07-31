import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect } from "react";

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  leagueId: string;
  budget: number;
  createdAt: string;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  ownerEmail: string | null;
  draftOrder: number | null;
}

export interface TeamCreateData {
  name: string;
  ownerId: string;
}

interface TeamState {
  // State
  teams: Record<string, Team[]>; // leagueId -> teams
  loading: Record<string, boolean>; // leagueId -> loading
  error: Record<string, string | null>; // leagueId -> error

  // Individual team operations
  teamLoading: Record<string, boolean>; // teamId -> loading
  teamError: Record<string, string | null>; // teamId -> error

  // Actions
  setTeams: (leagueId: string, teams: Team[]) => void;
  setLoading: (leagueId: string, loading: boolean) => void;
  setError: (leagueId: string, error: string | null) => void;
  setTeamLoading: (teamId: string, loading: boolean) => void;
  setTeamError: (teamId: string, error: string | null) => void;

  // API Actions
  fetchTeams: (leagueId: string) => Promise<void>;
  createTeam: (leagueId: string, teamData: TeamCreateData) => Promise<boolean>;
  updateTeam: (
    leagueId: string,
    teamId: string,
    updates: { name?: string; draftOrder?: number }
  ) => Promise<boolean>;
  deleteTeam: (leagueId: string, teamId: string) => Promise<boolean>;

  // Utility
  reset: () => void;
  resetLeague: (leagueId: string) => void;
}

export const useTeamStore = create<TeamState>()(
  devtools(
    (set, get) => ({
      // Initial state
      teams: {},
      loading: {},
      error: {},
      teamLoading: {},
      teamError: {},

      // Setters
      setTeams: (leagueId, teams) => {
        const currentTeams = get().teams;
        set({ teams: { ...currentTeams, [leagueId]: teams } });
      },

      setLoading: (leagueId, loading) => {
        const currentLoading = get().loading;
        set({ loading: { ...currentLoading, [leagueId]: loading } });
      },

      setError: (leagueId, error) => {
        const currentError = get().error;
        set({ error: { ...currentError, [leagueId]: error } });
      },

      setTeamLoading: (teamId, loading) => {
        const currentLoading = get().teamLoading;
        set({ teamLoading: { ...currentLoading, [teamId]: loading } });
      },

      setTeamError: (teamId, error) => {
        const currentError = get().teamError;
        set({ teamError: { ...currentError, [teamId]: error } });
      },

      // API Actions
      fetchTeams: async (leagueId: string) => {
        try {
          get().setLoading(leagueId, true);
          get().setError(leagueId, null);

          const response = await fetch(`/api/leagues/${leagueId}/teams`);
          const data = await response.json();

          if (data.success) {
            get().setTeams(leagueId, data.teams);
          } else {
            get().setError(leagueId, data.error || "Failed to fetch teams");
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch teams";
          get().setError(leagueId, errorMessage);
        } finally {
          get().setLoading(leagueId, false);
        }
      },

      createTeam: async (
        leagueId: string,
        teamData: TeamCreateData
      ): Promise<boolean> => {
        try {
          get().setError(leagueId, null);

          const response = await fetch(`/api/leagues/${leagueId}/teams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamData),
          });

          const data = await response.json();

          if (data.success) {
            // Add new team to the current teams list
            const currentTeams = get().teams[leagueId] || [];
            get().setTeams(leagueId, [...currentTeams, data.team]);
            return true;
          } else {
            get().setError(leagueId, data.error || "Failed to create team");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to create team";
          get().setError(leagueId, errorMessage);
          return false;
        }
      },

      updateTeam: async (
        leagueId: string,
        teamId: string,
        updates: { name?: string; draftOrder?: number }
      ): Promise<boolean> => {
        try {
          get().setTeamLoading(teamId, true);
          get().setTeamError(teamId, null);

          const response = await fetch(
            `/api/leagues/${leagueId}/teams/${teamId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }
          );

          const data = await response.json();

          if (data.success) {
            // Update team in the teams list
            const currentTeams = get().teams[leagueId] || [];
            const updatedTeams = currentTeams.map((team) =>
              team.id === teamId ? { ...team, ...updates } : team
            );
            get().setTeams(leagueId, updatedTeams);
            return true;
          } else {
            get().setTeamError(teamId, data.error || "Failed to update team");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to update team";
          get().setTeamError(teamId, errorMessage);
          return false;
        } finally {
          get().setTeamLoading(teamId, false);
        }
      },

      deleteTeam: async (
        leagueId: string,
        teamId: string
      ): Promise<boolean> => {
        try {
          get().setTeamLoading(teamId, true);
          get().setTeamError(teamId, null);

          const response = await fetch(
            `/api/leagues/${leagueId}/teams/${teamId}`,
            {
              method: "DELETE",
            }
          );

          const data = await response.json();

          if (data.success) {
            // Remove team from the teams list
            const currentTeams = get().teams[leagueId] || [];
            const filteredTeams = currentTeams.filter(
              (team) => team.id !== teamId
            );
            get().setTeams(leagueId, filteredTeams);
            return true;
          } else {
            get().setTeamError(teamId, data.error || "Failed to delete team");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to delete team";
          get().setTeamError(teamId, errorMessage);
          return false;
        } finally {
          get().setTeamLoading(teamId, false);
        }
      },

      reset: () => {
        set({
          teams: {},
          loading: {},
          error: {},
          teamLoading: {},
          teamError: {},
        });
      },

      resetLeague: (leagueId: string) => {
        const { teams, loading, error } = get();
        const { [leagueId]: removedTeams, ...remainingTeams } = teams;
        const { [leagueId]: removedLoading, ...remainingLoading } = loading;
        const { [leagueId]: removedError, ...remainingError } = error;

        set({
          teams: remainingTeams,
          loading: remainingLoading,
          error: remainingError,
        });
      },
    }),
    {
      name: "team-store",
    }
  )
);

// Stable empty array reference to avoid re-renders
const EMPTY_TEAMS_ARRAY: Team[] = [];

// Hook for team management in a specific league
export function useLeagueTeams(leagueId?: string) {
  const { userId, isLoaded } = useAuth();

  // Use stable selectors to avoid infinite loops
  const teams = useTeamStore(
    useCallback(
      (state) =>
        leagueId && state.teams[leagueId]
          ? state.teams[leagueId]
          : EMPTY_TEAMS_ARRAY,
      [leagueId]
    )
  );

  const loading = useTeamStore(
    useCallback(
      (state) => (leagueId ? (state.loading[leagueId] ?? false) : false),
      [leagueId]
    )
  );

  const error = useTeamStore(
    useCallback(
      (state) => (leagueId ? (state.error[leagueId] ?? null) : null),
      [leagueId]
    )
  );

  // Create stable references for actions
  const fetchTeams = useCallback(() => {
    if (leagueId) {
      useTeamStore.getState().fetchTeams(leagueId);
    }
  }, [leagueId]);

  const createTeam = useCallback(
    async (teamData: TeamCreateData) => {
      if (leagueId) {
        return useTeamStore.getState().createTeam(leagueId, teamData);
      }
      return false;
    },
    [leagueId]
  );

  const updateTeam = useCallback(
    async (teamId: string, updates: { name?: string; draftOrder?: number }) => {
      if (leagueId) {
        return useTeamStore.getState().updateTeam(leagueId, teamId, updates);
      }
      return false;
    },
    [leagueId]
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      if (leagueId) {
        return useTeamStore.getState().deleteTeam(leagueId, teamId);
      }
      return false;
    },
    [leagueId]
  );

  // Auto-fetch teams when needed
  useEffect(() => {
    if (isLoaded && userId && leagueId) {
      const state = useTeamStore.getState();
      const hasTeamsForLeague = state.teams[leagueId];
      const isCurrentlyLoading = state.loading[leagueId];

      // Only fetch if we haven't fetched teams for this league yet and we're not currently loading
      if (hasTeamsForLeague === undefined && !isCurrentlyLoading) {
        useTeamStore.getState().fetchTeams(leagueId);
      }
    }
  }, [userId, isLoaded, leagueId]);

  return {
    teams,
    loading: loading || !isLoaded,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}
