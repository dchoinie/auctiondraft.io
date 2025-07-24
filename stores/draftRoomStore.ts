import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DraftRoomState } from "@/party";

interface DraftStateStore {
  draftStates: Record<string, DraftRoomState | null>;
  setDraftState: (leagueId: string, state: DraftRoomState | null) => void;
  updateDraftState: (
    leagueId: string,
    updater: (prev: DraftRoomState | null) => DraftRoomState | null
  ) => void;
  resetDraftState: (leagueId: string) => void;
}

export const useDraftStateStore = create<DraftStateStore>()(
  devtools(
    (set, get) => ({
      draftStates: {},
      setDraftState: (leagueId, state) => {
        set((prev) => ({
          draftStates: { ...prev.draftStates, [leagueId]: state },
        }));
      },
      updateDraftState: (leagueId, updater) => {
        set((prev) => ({
          draftStates: {
            ...prev.draftStates,
            [leagueId]: updater(prev.draftStates[leagueId] ?? null),
          },
        }));
      },
      resetDraftState: (leagueId) => {
        set((prev) => {
          const { [leagueId]: removed, ...rest } = prev.draftStates;
          return { draftStates: rest };
        });
      },
    }),
    { name: "draft-state-store" }
  )
);

export function useDraftState(leagueId?: string) {
  return useDraftStateStore((state) =>
    leagueId && state.draftStates[leagueId] ? state.draftStates[leagueId] : null
  );
}
