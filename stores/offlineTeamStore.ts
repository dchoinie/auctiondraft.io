import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface OfflineTeam {
  id: string;
  name: string;
  leagueId: string;
  budget: number;
  draftOrder: number | null;
  createdAt: string;
  isAdmin?: boolean;
}

interface OfflineTeamState {
  // State
  teams: OfflineTeam[];
  loading: boolean;
  error: string | null;

  // Actions
  setTeams: (teams: OfflineTeam[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchTeams: (leagueId: string) => Promise<void>;
  createTeam: (leagueId: string, teamData: { name: string; budget: number }) => Promise<boolean>;
  updateTeam: (teamId: string, updates: Partial<OfflineTeam>) => Promise<boolean>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  reset: () => void;
}

export const useOfflineTeamStore = create<OfflineTeamState>()(
  devtools(
    (set, get) => ({
      // Initial state
      teams: [],
      loading: false,
      error: null,

      // Actions
      setTeams: (teams) => set({ teams }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      fetchTeams: async (leagueId: string) => {
        try {
          set({ loading: true, error: null });
          const response = await fetch(`/api/leagues/${leagueId}/offline-teams`);
          const data = await response.json();

          if (data.success) {
            set({ teams: data.teams });
          } else {
            set({ error: data.error || "Failed to fetch offline teams" });
          }
        } catch (err) {
          console.error("Error fetching offline teams:", err);
          set({
            error: err instanceof Error ? err.message : "Failed to fetch offline teams",
          });
        } finally {
          set({ loading: false });
        }
      },

      createTeam: async (leagueId: string, teamData: { name: string; budget: number }): Promise<boolean> => {
        try {
          set({ error: null });
          const response = await fetch(`/api/leagues/${leagueId}/offline-teams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamData),
          });

          const data = await response.json();

          if (data.success) {
            // Refresh teams list
            get().fetchTeams(leagueId);
            return true;
          } else {
            set({ error: data.error || "Failed to create offline team" });
            return false;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to create offline team";
          set({ error: errorMessage });
          return false;
        }
      },

      updateTeam: async (teamId: string, updates: Partial<OfflineTeam>): Promise<boolean> => {
        try {
          set({ error: null });
          const response = await fetch(`/api/leagues/offline-teams/${teamId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });

          const data = await response.json();

          if (data.success) {
            // Update local state
            const currentTeams = get().teams;
            set({
              teams: currentTeams.map((team) =>
                team.id === teamId ? { ...team, ...updates } : team
              ),
            });
            return true;
          } else {
            set({ error: data.error || "Failed to update offline team" });
            return false;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to update offline team";
          set({ error: errorMessage });
          return false;
        }
      },

      deleteTeam: async (teamId: string): Promise<boolean> => {
        try {
          set({ error: null });
          const response = await fetch(`/api/leagues/offline-teams/${teamId}`, {
            method: "DELETE",
          });

          const data = await response.json();

          if (data.success) {
            // Remove from local state
            const currentTeams = get().teams;
            set({
              teams: currentTeams.filter((team) => team.id !== teamId),
            });
            return true;
          } else {
            set({ error: data.error || "Failed to delete offline team" });
            return false;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to delete offline team";
          set({ error: errorMessage });
          return false;
        }
      },

      reset: () => {
        set({
          teams: [],
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: "offline-team-store",
    }
  )
); 