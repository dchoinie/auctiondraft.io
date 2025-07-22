import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect } from "react";

export interface Keeper {
  id: string;
  leagueId: string;
  teamId: string;
  playerId: string;
  keeperPrice: number;
  createdAt: string;
}

interface KeepersState {
  // State
  keepers: Record<string, Keeper[]>; // leagueId -> keepers
  loading: Record<string, boolean>; // leagueId -> loading
  error: Record<string, string | null>; // leagueId -> error

  // Actions
  setKeepers: (leagueId: string, keepers: Keeper[]) => void;
  setLoading: (leagueId: string, loading: boolean) => void;
  setError: (leagueId: string, error: string | null) => void;

  // API Actions
  fetchKeepers: (leagueId: string) => Promise<void>;
  createKeeper: (
    leagueId: string,
    keeperData: {
      team_id: string;
      league_id: string;
      player_id: string;
      amount: number;
    }
  ) => Promise<boolean>;
  deleteKeeper: (leagueId: string, keeperId: string) => Promise<boolean>;

  // Utility
  reset: () => void;
  resetLeague: (leagueId: string) => void;
}

export const useKeepersStore = create<KeepersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      keepers: {},
      loading: {},
      error: {},

      // Setters
      setKeepers: (leagueId, keepers) => {
        const currentKeepers = get().keepers;
        set({ keepers: { ...currentKeepers, [leagueId]: keepers } });
      },

      setLoading: (leagueId, loading) => {
        const currentLoading = get().loading;
        set({ loading: { ...currentLoading, [leagueId]: loading } });
      },

      setError: (leagueId, error) => {
        const currentError = get().error;
        set({ error: { ...currentError, [leagueId]: error } });
      },

      // API Actions
      fetchKeepers: async (leagueId: string) => {
        try {
          get().setLoading(leagueId, true);
          get().setError(leagueId, null);

          const response = await fetch(`/api/leagues/${leagueId}/keepers`);
          const data = await response.json();

          if (response.ok && data.keepers) {
            get().setKeepers(leagueId, data.keepers);
          } else {
            get().setError(leagueId, data.error || "Failed to fetch keepers");
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch keepers";
          get().setError(leagueId, errorMessage);
        } finally {
          get().setLoading(leagueId, false);
        }
      },

      createKeeper: async (
        leagueId: string,
        keeperData: {
          team_id: string;
          league_id: string;
          player_id: string;
          amount: number;
        }
      ): Promise<boolean> => {
        try {
          const response = await fetch(`/api/leagues/${leagueId}/keepers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(keeperData),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Refresh keepers after creating
            get().fetchKeepers(leagueId);
            return true;
          } else {
            return false;
          }
        } catch (err) {
          return false;
        }
      },

      deleteKeeper: async (
        leagueId: string,
        keeperId: string
      ): Promise<boolean> => {
        try {
          const response = await fetch(
            `/api/leagues/${leagueId}/keepers/${keeperId}`,
            {
              method: "DELETE",
            }
          );

          if (response.ok) {
            // Remove keeper from the keepers list
            const currentKeepers = get().keepers[leagueId] || [];
            const filteredKeepers = currentKeepers.filter(
              (keeper) => keeper.id !== keeperId
            );
            get().setKeepers(leagueId, filteredKeepers);
            return true;
          } else {
            return false;
          }
        } catch (err) {
          return false;
        }
      },

      reset: () => {
        set({
          keepers: {},
          loading: {},
          error: {},
        });
      },

      resetLeague: (leagueId: string) => {
        const { keepers, loading, error } = get();
        const { [leagueId]: removedKeepers, ...remainingKeepers } = keepers;
        const { [leagueId]: removedLoading, ...remainingLoading } = loading;
        const { [leagueId]: removedError, ...remainingError } = error;

        set({
          keepers: remainingKeepers,
          loading: remainingLoading,
          error: remainingError,
        });
      },
    }),
    {
      name: "keepers-store",
    }
  )
);

// Stable empty array reference to avoid re-renders
const EMPTY_KEEPERS_ARRAY: Keeper[] = [];

// Hook for keepers management in a specific league
export function useLeagueKeepers(leagueId?: string) {
  const { userId, isLoaded } = useAuth();

  // Use stable selectors to avoid infinite loops
  const keepers = useKeepersStore(
    useCallback(
      (state) =>
        leagueId && state.keepers[leagueId]
          ? state.keepers[leagueId]
          : EMPTY_KEEPERS_ARRAY,
      [leagueId]
    )
  );

  const loading = useKeepersStore(
    useCallback(
      (state) => (leagueId ? (state.loading[leagueId] ?? false) : false),
      [leagueId]
    )
  );

  const error = useKeepersStore(
    useCallback(
      (state) => (leagueId ? (state.error[leagueId] ?? null) : null),
      [leagueId]
    )
  );

  // Create stable references for actions
  const fetchKeepers = useCallback(() => {
    if (leagueId) {
      useKeepersStore.getState().fetchKeepers(leagueId);
    }
  }, [leagueId]);

  const createKeeper = useCallback(
    async (keeperData: {
      team_id: string;
      league_id: string;
      player_id: string;
      amount: number;
    }) => {
      if (leagueId) {
        return useKeepersStore.getState().createKeeper(leagueId, keeperData);
      }
      return false;
    },
    [leagueId]
  );

  const deleteKeeper = useCallback(
    async (keeperId: string) => {
      if (leagueId) {
        return useKeepersStore.getState().deleteKeeper(leagueId, keeperId);
      }
      return false;
    },
    [leagueId]
  );

  // Auto-fetch keepers when needed
  useEffect(() => {
    if (isLoaded && userId && leagueId) {
      const state = useKeepersStore.getState();
      const hasKeepersForLeague = state.keepers[leagueId];
      const isCurrentlyLoading = state.loading[leagueId];

      // Only fetch if we haven't fetched keepers for this league yet and we're not currently loading
      if (hasKeepersForLeague === undefined && !isCurrentlyLoading) {
        useKeepersStore.getState().fetchKeepers(leagueId);
      }
    }
  }, [userId, isLoaded, leagueId]);

  return {
    keepers,
    loading: loading || !isLoaded,
    error,
    fetchKeepers,
    createKeeper,
    deleteKeeper,
  };
}
