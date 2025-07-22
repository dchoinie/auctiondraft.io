import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface DraftedPlayer {
  id: string;
  draftPrice: number;
  teamId: string;
  playerId: string;
  teamName: string;
  playerFirstName: string;
  playerLastName: string;
  playerPosition: string;
  playerTeam: string;
}

interface DraftedPlayersState {
  draftedPlayers: Record<string, DraftedPlayer[]>; // leagueId -> drafted players
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  fetchDraftedPlayers: (leagueId: string) => Promise<void>;
  resetLeague: (leagueId: string) => void;
}

export const useDraftedPlayersStore = create<DraftedPlayersState>()(
  devtools(
    (set, get) => ({
      draftedPlayers: {},
      loading: {},
      error: {},
      fetchDraftedPlayers: async (leagueId: string) => {
        set((state) => ({
          loading: { ...state.loading, [leagueId]: true },
          error: { ...state.error, [leagueId]: null },
        }));
        try {
          const res = await fetch(`/api/leagues/${leagueId}/drafted-players`);
          const data = await res.json();
          if (data.success) {
            set((state) => ({
              draftedPlayers: {
                ...state.draftedPlayers,
                [leagueId]: data.draftedPlayers,
              },
              loading: { ...state.loading, [leagueId]: false },
              error: { ...state.error, [leagueId]: null },
            }));
          } else {
            set((state) => ({
              loading: { ...state.loading, [leagueId]: false },
              error: {
                ...state.error,
                [leagueId]: data.error || "Failed to fetch drafted players",
              },
            }));
          }
        } catch (err) {
          set((state) => ({
            loading: { ...state.loading, [leagueId]: false },
            error: {
              ...state.error,
              [leagueId]:
                err instanceof Error
                  ? err.message
                  : "Failed to fetch drafted players",
            },
          }));
        }
      },
      resetLeague: (leagueId: string) => {
        set((state) => {
          const { [leagueId]: removed, ...rest } = state.draftedPlayers;
          const { [leagueId]: removedLoading, ...restLoading } = state.loading;
          const { [leagueId]: removedError, ...restError } = state.error;
          return {
            draftedPlayers: rest,
            loading: restLoading,
            error: restError,
          };
        });
      },
    }),
    { name: "drafted-players-store" }
  )
);

// Stable empty array to avoid infinite loop in selector
const EMPTY_DRAFTED_PLAYERS: DraftedPlayer[] = [];

// Hook for a specific league's drafted players
export function useDraftedPlayers(leagueId?: string) {
  return useDraftedPlayersStore((state) =>
    leagueId && state.draftedPlayers[leagueId]
      ? state.draftedPlayers[leagueId]
      : EMPTY_DRAFTED_PLAYERS
  );
}
