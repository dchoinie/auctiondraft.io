import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useCallback, useEffect } from "react";

export interface League {
  id: string;
  name: string;
  ownerId: string;
  isDraftStarted: number;
  createdAt: string;
}

export interface LeagueSettings {
  id: string;
  name: string;
  ownerId: string;
  isDraftStarted: number;
  leagueSize: number;
  draftDate: string | null;
  draftTime: string | null;
  draftLocation: string | null;
  rosterSize: number;
  startingBudget: number;
  qbSlots: number;
  rbSlots: number;
  wrSlots: number;
  teSlots: number;
  flexSlots: number;
  dstSlots: number;
  kSlots: number;
  benchSlots: number;
}

interface LeagueState {
  // State
  leagues: League[];
  loading: boolean;
  error: string | null;
  adminStatusCache: Record<string, boolean>; // leagueId -> isAdmin
  adminStatusLoading: Record<string, boolean>; // leagueId -> loading
  settingsCache: Record<string, LeagueSettings>; // leagueId -> settings
  settingsLoading: Record<string, boolean>; // leagueId -> loading
  settingsError: Record<string, string | null>; // leagueId -> error

  // Actions
  setLeagues: (leagues: League[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchLeagues: () => Promise<void>;
  setAdminStatus: (leagueId: string, isAdmin: boolean) => void;
  setAdminStatusLoading: (leagueId: string, loading: boolean) => void;
  fetchAdminStatus: (leagueId: string) => Promise<void>;
  setLeagueSettings: (leagueId: string, settings: LeagueSettings) => void;
  setSettingsLoading: (leagueId: string, loading: boolean) => void;
  setSettingsError: (leagueId: string, error: string | null) => void;
  fetchLeagueSettings: (leagueId: string) => Promise<void>;
  updateLeagueSettings: (
    leagueId: string,
    settings: LeagueSettings
  ) => Promise<boolean>;
  addLeague: (league: League) => void;
  updateLeague: (leagueId: string, updates: Partial<League>) => void;
  removeLeague: (leagueId: string) => void;
  refetch: () => void;
  reset: () => void;
}

export const useLeagueStore = create<LeagueState>()(
  devtools(
    (set, get) => ({
      // Initial state
      leagues: [],
      loading: true,
      error: null,
      adminStatusCache: {},
      adminStatusLoading: {},
      settingsCache: {},
      settingsLoading: {},
      settingsError: {},

      // Actions
      setLeagues: (leagues) => set({ leagues }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      fetchLeagues: async () => {
        try {
          set({ loading: true, error: null });

          console.log("Fetching leagues from API...");
          const response = await fetch("/api/leagues");
          const data = await response.json();

          console.log("Leagues API response:", data);

          if (data.success) {
            set({ leagues: data.leagues });
            console.log("League membership updated:", {
              hasLeagues: data.leagues.length > 0,
              leagueCount: data.leagues.length,
            });
          } else {
            set({ error: data.error || "Failed to fetch leagues" });
          }
        } catch (err) {
          console.error("Error fetching leagues:", err);
          set({
            error:
              err instanceof Error ? err.message : "Failed to fetch leagues",
          });
        } finally {
          set({ loading: false });
        }
      },

      setAdminStatus: (leagueId, isAdmin) => {
        const currentCache = get().adminStatusCache;
        set({
          adminStatusCache: { ...currentCache, [leagueId]: isAdmin },
        });
      },

      setAdminStatusLoading: (leagueId, loading) => {
        const currentLoading = get().adminStatusLoading;
        set({
          adminStatusLoading: { ...currentLoading, [leagueId]: loading },
        });
      },

      fetchAdminStatus: async (leagueId: string) => {
        // Check if we already have this cached
        const { adminStatusCache } = get();
        if (adminStatusCache[leagueId] !== undefined) {
          return;
        }

        try {
          get().setAdminStatusLoading(leagueId, true);
          const response = await fetch(
            `/api/check-league-admin?leagueId=${leagueId}`
          );
          const data = await response.json();

          if (data.success !== false) {
            get().setAdminStatus(leagueId, data.isAdmin || false);
          } else {
            console.error("Failed to check admin status:", data.error);
          }
        } catch (err) {
          console.error("Error checking admin status:", err);
        } finally {
          get().setAdminStatusLoading(leagueId, false);
        }
      },

      setLeagueSettings: (leagueId, settings) => {
        const currentCache = get().settingsCache;
        set({
          settingsCache: { ...currentCache, [leagueId]: settings },
        });
      },

      setSettingsLoading: (leagueId, loading) => {
        const currentLoading = get().settingsLoading;
        set({
          settingsLoading: { ...currentLoading, [leagueId]: loading },
        });
      },

      setSettingsError: (leagueId, error) => {
        const currentError = get().settingsError;
        set({
          settingsError: { ...currentError, [leagueId]: error },
        });
      },

      fetchLeagueSettings: async (leagueId: string) => {
        try {
          get().setSettingsLoading(leagueId, true);
          get().setSettingsError(leagueId, null);

          console.log("Fetching settings for league:", leagueId);
          const response = await fetch(`/api/leagues/${leagueId}/settings`);

          console.log("Response status:", response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.log("Error response:", errorData);
            throw new Error(
              errorData.error ||
                `HTTP ${response.status}: Failed to fetch league settings`
            );
          }

          const data = await response.json();
          console.log("Settings data:", data);

          if (data.success) {
            get().setLeagueSettings(leagueId, data.league);
          } else {
            get().setSettingsError(
              leagueId,
              data.error || "Failed to fetch league settings"
            );
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to fetch league settings";
          get().setSettingsError(leagueId, errorMessage);
          console.error("Error fetching league settings:", err);
        } finally {
          get().setSettingsLoading(leagueId, false);
        }
      },

      updateLeagueSettings: async (
        leagueId: string,
        settings: LeagueSettings
      ): Promise<boolean> => {
        try {
          get().setSettingsError(leagueId, null);

          const response = await fetch(`/api/leagues/${leagueId}/settings`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(settings),
          });

          if (!response.ok) {
            throw new Error("Failed to save settings");
          }

          const data = await response.json();

          if (data.success) {
            // Update the cached settings
            get().setLeagueSettings(leagueId, settings);

            // Also update basic league info if name changed
            if (settings.name) {
              get().updateLeague(leagueId, { name: settings.name });
            }

            return true;
          } else {
            get().setSettingsError(
              leagueId,
              data.error || "Failed to save settings"
            );
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to save settings";
          get().setSettingsError(leagueId, errorMessage);
          return false;
        }
      },

      addLeague: (league) => {
        const currentLeagues = get().leagues;
        set({ leagues: [...currentLeagues, league] });
      },

      updateLeague: (leagueId, updates) => {
        const currentLeagues = get().leagues;
        set({
          leagues: currentLeagues.map((league) =>
            league.id === leagueId ? { ...league, ...updates } : league
          ),
        });
      },

      removeLeague: (leagueId) => {
        const currentLeagues = get().leagues;
        const currentAdminCache = get().adminStatusCache;
        const currentAdminLoading = get().adminStatusLoading;
        const currentSettingsCache = get().settingsCache;
        const currentSettingsLoading = get().settingsLoading;
        const currentSettingsError = get().settingsError;

        // Remove from leagues array
        const updatedLeagues = currentLeagues.filter(
          (league) => league.id !== leagueId
        );

        // Remove from all caches
        const { [leagueId]: removedAdmin, ...updatedAdminCache } =
          currentAdminCache;
        const { [leagueId]: removedAdminLoading, ...updatedAdminLoading } =
          currentAdminLoading;
        const { [leagueId]: removedSettings, ...updatedSettingsCache } =
          currentSettingsCache;
        const {
          [leagueId]: removedSettingsLoading,
          ...updatedSettingsLoading
        } = currentSettingsLoading;
        const { [leagueId]: removedSettingsError, ...updatedSettingsError } =
          currentSettingsError;

        set({
          leagues: updatedLeagues,
          adminStatusCache: updatedAdminCache,
          adminStatusLoading: updatedAdminLoading,
          settingsCache: updatedSettingsCache,
          settingsLoading: updatedSettingsLoading,
          settingsError: updatedSettingsError,
        });
      },

      refetch: () => {
        get().fetchLeagues();
      },

      reset: () => {
        set({
          leagues: [],
          loading: false,
          error: null,
          adminStatusCache: {},
          adminStatusLoading: {},
          settingsCache: {},
          settingsLoading: {},
          settingsError: {},
        });
      },
    }),
    {
      name: "league-store",
    }
  )
);

// Convenience hooks that integrate with Clerk auth
import { useAuth } from "@clerk/nextjs";

// Hook for league membership (replaces useLeagueMembership)
export function useLeagueMembership() {
  const { userId, isLoaded } = useAuth();

  // Use individual selectors to avoid unnecessary re-renders
  const leagues = useLeagueStore((state) => state.leagues);
  const loading = useLeagueStore((state) => state.loading);
  const error = useLeagueStore((state) => state.error);

  // Create stable references for actions
  const refetch = useCallback(() => {
    useLeagueStore.getState().fetchLeagues();
  }, []);

  // Computed values
  const hasLeagues = leagues.length > 0;

  // Auto-fetch leagues when auth is loaded and we have a userId
  useEffect(() => {
    if (isLoaded) {
      if (userId) {
        useLeagueStore.getState().fetchLeagues();
      } else {
        useLeagueStore.getState().reset();
      }
    }
  }, [userId, isLoaded]);

  return {
    hasLeagues,
    leagues,
    loading: loading || !isLoaded,
    error,
    refetch,
  };
}

// Hook for league admin status (replaces useLeagueAdmin)
export function useLeagueAdmin(leagueId?: string) {
  const { userId, isLoaded } = useAuth();

  // Use stable selectors to avoid infinite loops
  const isAdmin = useLeagueStore(
    useCallback(
      (state) => (leagueId ? state.adminStatusCache[leagueId] ?? false : false),
      [leagueId]
    )
  );

  const loading = useLeagueStore(
    useCallback(
      (state) =>
        leagueId ? state.adminStatusLoading[leagueId] ?? false : false,
      [leagueId]
    )
  );

  // Auto-fetch admin status when needed
  useEffect(() => {
    if (isLoaded && userId && leagueId) {
      useLeagueStore.getState().fetchAdminStatus(leagueId);
    }
  }, [userId, isLoaded, leagueId]);

  return {
    isAdmin,
    loading: loading || !isLoaded,
    error: null, // Admin errors are handled internally for now
  };
}

// Hook for league settings (new functionality)
export function useLeagueSettings(leagueId?: string) {
  const { userId, isLoaded } = useAuth();

  // Use stable selectors to avoid infinite loops
  const settings = useLeagueStore(
    useCallback(
      (state) =>
        leagueId && state.settingsCache[leagueId]
          ? state.settingsCache[leagueId]
          : null,
      [leagueId]
    )
  );

  const loading = useLeagueStore(
    useCallback(
      (state) => (leagueId ? state.settingsLoading[leagueId] ?? false : false),
      [leagueId]
    )
  );

  const error = useLeagueStore(
    useCallback(
      (state) => (leagueId ? state.settingsError[leagueId] ?? null : null),
      [leagueId]
    )
  );

  // Create stable references for actions
  const fetchSettings = useCallback(() => {
    if (leagueId) {
      useLeagueStore.getState().fetchLeagueSettings(leagueId);
    }
  }, [leagueId]);

  const updateSettings = useCallback(
    async (newSettings: LeagueSettings) => {
      if (leagueId) {
        return useLeagueStore
          .getState()
          .updateLeagueSettings(leagueId, newSettings);
      }
      return false;
    },
    [leagueId]
  );

  // Auto-fetch settings when needed
  useEffect(() => {
    if (isLoaded && userId && leagueId) {
      const state = useLeagueStore.getState();
      const hasSettingsForLeague = state.settingsCache[leagueId];
      const isCurrentlyLoading = state.settingsLoading[leagueId];

      // Only fetch if we haven't fetched settings for this league yet and we're not currently loading
      if (hasSettingsForLeague === undefined && !isCurrentlyLoading) {
        useLeagueStore.getState().fetchLeagueSettings(leagueId);
      }
    }
  }, [userId, isLoaded, leagueId]);

  return {
    settings,
    loading: loading || !isLoaded,
    error,
    fetchSettings,
    updateSettings,
  };
}

// Direct store access for components that need more control
export function useLeagueActions() {
  return {
    addLeague: useLeagueStore((state) => state.addLeague),
    updateLeague: useLeagueStore((state) => state.updateLeague),
    removeLeague: useLeagueStore((state) => state.removeLeague),
    refetch: useLeagueStore((state) => state.refetch),
  };
}
