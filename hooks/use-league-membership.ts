import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface League {
  id: string;
  name: string;
  ownerId: string;
  isDraftStarted: number;
  createdAt: string;
}

interface LeagueMembershipStatus {
  hasLeagues: boolean;
  leagues: League[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLeagueMembership(): LeagueMembershipStatus {
  const { userId, isLoaded } = useAuth();
  const [hasLeagues, setHasLeagues] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/leagues");
      const data = await response.json();

      if (data.success) {
        setLeagues(data.leagues);
        setHasLeagues(data.leagues.length > 0);
      } else {
        setError(data.error || "Failed to fetch leagues");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leagues");
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchLeagues();
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    fetchLeagues();
  }, [userId, isLoaded]);

  return {
    hasLeagues,
    leagues,
    loading,
    error,
    refetch,
  };
}
