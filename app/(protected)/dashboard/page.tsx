"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueMembership } from "@/stores/leagueStore";
import { useLeagueSettings } from "@/stores/leagueStore";
import { useLeagueTeams } from "@/stores/teamStore";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { LeagueCreationCTA } from "@/components/LeagueCreationCTA";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  Settings,
  Calendar,
  Users as UsersIcon,
  List,
  User as UserIcon,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const {
    user,
    loading: userLoading,
    error: userError,
    needsProfileCompletion,
    updateProfile,
    refetch: refetchUser,
  } = useUser();
  const {
    hasLeagues,
    leagues,
    loading: leagueLoading,
    error: leagueError,
  } = useLeagueMembership();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  // Handle payment success redirect
  useEffect(() => {
    if (paymentStatus === "success") {
      console.log("Payment successful, refreshing user data...");
      refetchUser();
      // Clear the URL parameter after a short delay
      setTimeout(() => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }, 3000);
    }
  }, [paymentStatus, refetchUser]); // refetchUser is now stable via useCallback

  // Show loading state while checking user data and league membership
  if (userLoading || leagueLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show error state if there's an error
  if (userError || leagueError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">
          Error: {userError || leagueError}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <NavCard
            title="My Teams"
            description="View and manage your fantasy teams."
            icon={<UserIcon className="h-8 w-8 text-blue-600" />}
            href="/players" // You may want to create a /my-teams page for a better experience
          />
          <NavCard
            title="NFL Players"
            description="Browse all available NFL players."
            icon={<Users className="h-8 w-8 text-green-600" />}
            href="/players"
          />
        </div>

        {paymentStatus === "success" && (
          <div className="mb-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment successful! Your league credits have been added to your
                account.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!hasLeagues ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LeagueCreationCTA />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Your Leagues</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leagues.map((league) => (
                  <LeagueCard
                    key={league.id}
                    league={league}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ProfileCompletionModal
        isOpen={needsProfileCompletion}
        onComplete={updateProfile}
      />
    </>
  );
}

interface LeagueCardProps {
  league: {
    id: string;
    name: string;
    ownerId: string;
    isDraftStarted: number;
  };
  currentUserId: string | undefined;
}

function NavCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  const router = useRouter();
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-primary/50"
      onClick={() => router.push(href)}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm pb-2">
        {description}
      </CardContent>
    </Card>
  );
}

function LeagueCard({ league, currentUserId }: LeagueCardProps) {
  const router = useRouter();
  const isOwner = league.ownerId === currentUserId;
  // Fetch league settings and teams
  const { settings } = useLeagueSettings(league.id);
  const { teams } = useLeagueTeams(league.id);
  // Find user's team in this league
  const userTeam = teams.find((team) => team.ownerId === currentUserId);
  const draftDate = settings?.draftDate || null;
  const draftTime = settings?.draftTime || null;
  const leagueSize = settings?.leagueSize || teams.length;

  const handleLeagueClick = () => {
    router.push(`/leagues/${league.id}`);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/leagues/${league.id}/settings`);
  };

  const handleTeamsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/leagues/${league.id}/teams`);
  };

  const handleDraftRoomClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/leagues/${league.id}/draft`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-2 hover:border-primary/50"
      onClick={handleLeagueClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {league.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4" />
          {isOwner ? "Owner" : "Member"} &bull; {teams.length}/{leagueSize}{" "}
          Teams
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Draft {league.isDraftStarted ? "Started" : "Not Started"}
        </div>
        {draftDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <List className="h-4 w-4" />
            Draft Date: {draftDate} {draftTime && `at ${draftTime}`}
          </div>
        )}
        {userTeam && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            Your Team: {userTeam.name}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <div className="flex gap-2 w-full flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleLeagueClick}
          >
            View League
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTeamsClick}
            className="flex items-center gap-2"
          >
            <UsersIcon className="h-4 w-4" />
            Teams
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDraftRoomClick}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Draft Room
          </Button>
          {isOwner && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSettingsClick}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
