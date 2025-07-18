import { create } from "zustand";
import { devtools } from "zustand/middleware";

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
  loading: boolean;
  error: string | null;
  lastFetch: number | null; // Global last fetch timestamp

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchPlayers: (page: number, limit?: number) => Promise<void>;
  getPlayersPage: (page: number) => PlayersPageData | null;
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

      getPlayersPage: (page: number) => {
        const state = get();
        return state.pagesCache[page] || null;
      },

      clearCache: () => set({ pagesCache: {}, lastFetch: null }),

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
