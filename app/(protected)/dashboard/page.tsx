"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueMembership } from "@/stores/leagueStore";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Plus, BarChart3, Users, Clock } from "lucide-react";
import Link from "next/link";
import { Team } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PageContent,
  StaggeredContent,
  StaggeredItem,
  FadeIn,
  SlideUp,
} from "@/components/ui/page-transition";

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

// Helper function to get draft status
function getDraftStatus(
  isDraftStarted: number,
  teams: Team[]
): { status: string; color: string } {
  if (isDraftStarted === 1) {
    return { status: "Live", color: "bg-green-500" };
  } else if (teams.length > 0) {
    return { status: "Pre-Draft", color: "bg-yellow-500" };
  } else {
    return { status: "Setup", color: "bg-gray-500" };
  }
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
      <PageContent>
        <div className="flex items-center justify-center min-h-screen">
          <FadeIn>
            <div className="text-lg text-gray-50">Loading...</div>
          </FadeIn>
        </div>
      </PageContent>
    );
  }

  // Show error state
  if (userError || leagueError) {
    return (
      <PageContent>
        <div className="flex items-center justify-center min-h-screen">
          <SlideUp>
            <div className="text-lg text-red-600">
              Error: {userError || leagueError}
            </div>
          </SlideUp>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <StaggeredContent>
        <StaggeredItem>
          <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Header with CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-50">Dashboard</h1>
                <p className="text-gray-400 mt-1">
                  Welcome back, {user?.firstName || user?.email}
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md"
              >
                <Link href="/leagues/create">
                  <Plus className="h-4 w-4" />
                  Create New League
                </Link>
              </Button>
            </div>

            {/* Payment Success Alert */}
            {paymentStatus === "success" && (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">
                  Payment successful! Your account has been updated.
                </AlertDescription>
              </Alert>
            )}

            {/* Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="green-bg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Total Leagues
                  </CardTitle>
                  <Users className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-50">
                    {leagues.length}
                  </div>
                  <p className="text-xs text-gray-400">
                    Active fantasy leagues
                  </p>
                </CardContent>
              </Card>

              <Card className="green-bg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Live Drafts
                  </CardTitle>
                  <Clock className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-50">
                    {
                      leagues.filter((league) => league.isDraftStarted === 1)
                        .length
                    }
                  </div>
                  <p className="text-xs text-gray-400">Currently in progress</p>
                </CardContent>
              </Card>

              <Card className="green-bg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Total Teams
                  </CardTitle>
                  <Users className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-50">
                    {Object.values(allLeagueTeams).reduce(
                      (total, teams) => total + teams.length,
                      0
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Across all leagues</p>
                </CardContent>
              </Card>

              <Card className="green-bg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Analytics
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-50">
                    Coming Soon
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leagues Table */}
            <Card className="green-bg">
              <CardHeader>
                <CardTitle className="text-gray-50">Your Leagues</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your fantasy football leagues and track draft progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leagues.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">
                      No leagues yet
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Create your first league to get started with auction
                      drafting
                    </p>
                    <Button asChild className="yellow-bg">
                      <Link href="/leagues/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Create League
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border border-gray-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700 hover:bg-gray-700/50">
                          <TableHead className="text-gray-300">
                            League Name
                          </TableHead>
                          <TableHead className="text-gray-300">Teams</TableHead>
                          <TableHead className="text-gray-300">
                            Draft Status
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Created
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leagues.map((league) => {
                          const teams = allLeagueTeams[league.id] || [];
                          const draftStatus = getDraftStatus(
                            league.isDraftStarted,
                            teams
                          );
                          const createdDate = new Date(
                            league.createdAt
                          ).toLocaleDateString();

                          return (
                            <TableRow
                              key={league.id}
                              className="border-gray-700 hover:bg-gray-700/50"
                            >
                              <TableCell className="font-medium text-gray-50">
                                {league.name}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {teams.length} /{" "}
                                {league.settings?.leagueSize || "?"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={`${draftStatus.color} text-white border-0`}
                                >
                                  {draftStatus.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {createdDate}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={`/leagues/${league.id}`}>
                                      View
                                    </Link>
                                  </Button>
                                  {league.isDraftStarted === 1 && (
                                    <Button asChild size="sm">
                                      <Link
                                        href={`/leagues/${league.id}/draft`}
                                      >
                                        Join Draft
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics Placeholder */}
            <Card className="green-bg">
              <CardHeader>
                <CardTitle className="text-gray-50 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Detailed insights and performance metrics for your leagues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-300 mb-2">
                    Analytics Coming Soon
                  </h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    We&apos;re working on comprehensive analytics to help you
                    track your fantasy football performance, draft strategies,
                    and league statistics.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    <Badge
                      variant="outline"
                      className="text-gray-400 border-gray-600"
                    >
                      Draft Performance
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-gray-400 border-gray-600"
                    >
                      Team Analytics
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-gray-400 border-gray-600"
                    >
                      League Trends
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-gray-400 border-gray-600"
                    >
                      Player Insights
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggeredItem>
      </StaggeredContent>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={needsProfileCompletion}
        onComplete={updateProfile}
      />
    </PageContent>
  );
}
