import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface LeagueAdminStatus {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useLeagueAdmin(leagueId?: string): LeagueAdminStatus {
  const { userId, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId || !leagueId) {
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/check-league-admin?leagueId=${leagueId}`
        );
        const data = await response.json();

        if (data.success !== false) {
          setIsAdmin(data.isAdmin || false);
        } else {
          setError(data.error || "Failed to check admin status");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check admin status"
        );
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [userId, isLoaded, leagueId]);

  return { isAdmin, loading, error };
}
