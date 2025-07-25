"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueMembership } from "@/stores/leagueStore";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Team } from "@/stores/teamStore";

// Types for invitations and payments
interface Invitation {
  id: string;
  leagueName: string;
  inviterEmail: string;
}
interface Payment {
  date: string;
  amount: string;
  currency: string;
  status: string;
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentStatus = searchParams.get("payment");

  // User info
  const {
    user,
    loading: userLoading,
    error: userError,
    needsProfileCompletion,
    updateProfile,
    refetch: refetchUser,
  } = useUser();

  // Leagues
  const {
    leagues,
    loading: leagueLoading,
    error: leagueError,
    refetch: refetchLeagues,
  } = useLeagueMembership();

  // Fetch all teams for all leagues and store in state
  const [allLeagueTeams, setAllLeagueTeams] = useState<Record<string, Team[]>>(
    {}
  );
  useEffect(() => {
    async function fetchAllTeams() {
      const teamsByLeague: Record<string, Team[]> = {};
      await Promise.all(
        leagues.map(async (league) => {
          const res = await fetch(`/api/leagues/${league.id}/teams`);
          const data = await res.json();
          teamsByLeague[league.id] = data.teams || [];
        })
      );
      setAllLeagueTeams(teamsByLeague);
    }
    if (leagues.length > 0) fetchAllTeams();
  }, [leagues]);

  // Invitations (scaffolded fetch)
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // Payment history (scaffolded fetch)
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  useEffect(() => {
    setPayLoading(true);
    fetch("/api/stripe/setup-status")
      .then((res) => res.json())
      .then((data) => {
        setPayments(data.payments || []);
      })
      .catch(() => {})
      .finally(() => setPayLoading(false));
  }, []);

  // Handle payment success redirect
  useEffect(() => {
    if (paymentStatus === "success") {
      refetchUser();
      setTimeout(() => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }, 3000);
    }
  }, [paymentStatus, refetchUser]);

  // Show loading state
  if (userLoading || leagueLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-50">Loading...</div>
      </div>
    );
  }

  // Show error state
  if (userError || leagueError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">
          Error: {userError || leagueError}
        </div>
      </div>
    );
  }

  return <div className="max-w-4xl mx-auto"></div>;
}
