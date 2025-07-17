import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface CurrentUser {
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

interface CurrentUserStatus {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  needsProfileCompletion: boolean;
  hasCredits: boolean;
  refetch: () => void;
  updateProfile: (firstName: string, lastName: string) => Promise<boolean>;
}

export function useCurrentUser(): CurrentUserStatus {
  const { userId, isLoaded } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/user/current");
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || "Failed to fetch user data");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user data"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
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
        setUser((prev) => (prev ? { ...prev, firstName, lastName } : null));
        return true;
      } else {
        setError(data.error || "Failed to update profile");
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
      return false;
    }
  };

  const refetch = () => {
    fetchUser();
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    fetchUser();
  }, [userId, isLoaded]);

  return {
    user,
    loading,
    error,
    needsProfileCompletion: !user?.firstName || !user?.lastName,
    hasCredits: (user?.leagueCredits || 0) > 0,
    refetch,
    updateProfile,
  };
}
