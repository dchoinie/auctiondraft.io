import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  leagueCredits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchUser: (userId: string) => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<boolean>;
  updateCredits: (credits: number) => void;
  refetch: (userId: string) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      loading: true,
      error: null,

      // Actions
      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      fetchUser: async (userId: string) => {
        if (!userId) {
          set({ loading: false });
          return;
        }

        try {
          set({ loading: true, error: null });

          const response = await fetch("/api/user/current");
          const data = await response.json();

          if (data.success) {
            set({ user: data.user });
          } else {
            set({ error: data.error || "Failed to fetch user data" });
          }
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Failed to fetch user data",
          });
        } finally {
          set({ loading: false });
        }
      },

      updateProfile: async (
        firstName: string,
        lastName: string
      ): Promise<boolean> => {
        try {
          const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ firstName, lastName }),
          });

          const data = await response.json();

          if (data.success) {
            const currentUser = get().user;
            if (currentUser) {
              set({
                user: { ...currentUser, firstName, lastName },
              });
            }
            return true;
          } else {
            set({ error: data.error || "Failed to update profile" });
            return false;
          }
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Failed to update profile",
          });
          return false;
        }
      },

      updateCredits: (credits: number) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, leagueCredits: credits },
          });
        }
      },

      refetch: (userId: string) => {
        get().fetchUser(userId);
      },

      reset: () => {
        set({
          user: null,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: "user-store",
    }
  )
);

// Convenience hook that integrates with Clerk auth
import { useAuth } from "@clerk/nextjs";
import { useEffect, useCallback } from "react";

export function useUser() {
  const { userId, isLoaded } = useAuth();

  // Use individual selectors to avoid unnecessary re-renders
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const error = useUserStore((state) => state.error);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const updateCredits = useUserStore((state) => state.updateCredits);

  // Create stable references for actions
  const fetchUser = useCallback(() => {
    if (userId) {
      useUserStore.getState().fetchUser(userId);
    }
  }, [userId]);

  const reset = useCallback(() => {
    useUserStore.getState().reset();
  }, []);

  const refetch = useCallback(() => {
    if (userId) {
      useUserStore.getState().fetchUser(userId);
    }
  }, [userId]);

  // Computed values
  const needsProfileCompletion = !user?.firstName || !user?.lastName;
  const hasCredits = (user?.leagueCredits || 0) > 0;

  // Auto-fetch user when auth is loaded and we have a userId
  useEffect(() => {
    if (isLoaded) {
      if (userId) {
        // Only fetch if we don't have user data or if the user ID changed
        if (!user || user.id !== userId) {
          useUserStore.getState().fetchUser(userId);
        }
      } else {
        useUserStore.getState().reset();
      }
    }
  }, [userId, isLoaded, user?.id]); // Remove function dependencies

  return {
    user,
    loading: loading || !isLoaded,
    error,
    needsProfileCompletion,
    hasCredits,
    updateProfile,
    refetch,
    updateCredits,
  };
}
