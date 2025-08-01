import { create } from "zustand";
import { devtools } from "zustand/middleware";
import React from "react"; // Added for usePlayersSearch hook

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  team: string | null;
  searchRank: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PlayersPageData {
  players: Player[];
  pagination: PaginationInfo;
  timestamp: number; // For cache invalidation
}

interface PlayersState {
  // State
  pagesCache: Record<number, PlayersPageData>; // page -> data
  playerCache: Record<string, Player>; // id -> Player
  loading: boolean;
  error: string | null;
  lastFetch: number | null; // Global last fetch timestamp

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchPlayers: (page: number, limit?: number) => Promise<void>;
  fetchPlayerById: (id: string) => Promise<void>;
  getPlayersPage: (page: number) => PlayersPageData | null;
  getPlayerById: (id: string) => Player | undefined;
  clearCache: () => void;
  isPageCached: (page: number, maxAge?: number) => boolean;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const DEFAULT_LIMIT = 50;

export const usePlayersStore = create<PlayersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      pagesCache: {},
      playerCache: {},
      loading: false,
      error: null,
      lastFetch: null,

      // Actions
      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      fetchPlayers: async (page: number, limit = DEFAULT_LIMIT) => {
        const state = get();

        // Check if page is already cached and fresh
        if (state.isPageCached(page)) {
          return;
        }

        try {
          set({ loading: true, error: null });

          const response = await fetch(
            `/api/players?page=${page}&limit=${limit}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch players");
          }

          const data = await response.json();
          const timestamp = Date.now();

          set((state) => ({
            pagesCache: {
              ...state.pagesCache,
              [page]: {
                players: data.players,
                pagination: data.pagination,
                timestamp,
              },
            },
            lastFetch: timestamp,
            loading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "An error occurred",
            loading: false,
          });
        }
      },

      fetchPlayerById: async (id: string) => {
        const state = get();
        if (state.playerCache[id]) {
          return;
        }
        try {
          set({ loading: true, error: null });
          const response = await fetch(`/api/players/${id}`);
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`Player ${id} not found in database`);
              // Don't throw error for 404, just log it
              set({ loading: false });
              return;
            }
            throw new Error(`Failed to fetch player by id: ${response.status}`);
          }
          const data = await response.json();
          if (data.player) {
            set((state) => ({
              playerCache: {
                ...state.playerCache,
                [id]: data.player,
              },
              loading: false,
            }));
          } else {
            console.warn(`No player data returned for ${id}`);
            set({ loading: false });
          }
        } catch (error) {
          console.error(`Error fetching player ${id}:`, error);
          set({
            error: error instanceof Error ? error.message : "An error occurred",
            loading: false,
          });
        }
      },

      getPlayersPage: (page: number) => {
        const state = get();
        return state.pagesCache[page] || null;
      },

      getPlayerById: (id: string) => {
        const state = get();
        return state.playerCache[id];
      },

      clearCache: () =>
        set({ pagesCache: {}, playerCache: {}, lastFetch: null }),

      isPageCached: (page: number, maxAge = CACHE_DURATION) => {
        const state = get();
        const pageData = state.pagesCache[page];

        if (!pageData) return false;

        const now = Date.now();
        return now - pageData.timestamp < maxAge;
      },
    }),
    {
      name: "players-store",
    }
  )
);

// Custom hook for easier usage
export const usePlayers = (page: number = 1, limit: number = DEFAULT_LIMIT) => {
  const store = usePlayersStore();

  const fetchPlayersPage = async () => {
    await store.fetchPlayers(page, limit);
  };

  const cachedData = store.getPlayersPage(page);

  return {
    players: cachedData?.players || [],
    pagination: cachedData?.pagination || {
      currentPage: page,
      totalPages: 1,
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    loading: store.loading,
    error: store.error,
    isPageCached: store.isPageCached,
    fetchPlayersPage,
    clearCache: store.clearCache,
  };
};

// Fetch players by search query (across all pages, up to a limit)
export const usePlayersSearch = (search: string, limit: number = 200) => {
  const [results, setResults] = React.useState<Player[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!search) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/players?search=${encodeURIComponent(search)}&limit=${limit}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to search players");
        return res.json();
      })
      .then((data) => {
        setResults(data.players || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, [search, limit]);

  return { players: results, loading, error };
};
