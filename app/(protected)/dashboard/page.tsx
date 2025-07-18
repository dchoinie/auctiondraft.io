"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueMembership } from "@/stores/leagueStore";
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
import { CheckCircle, Settings, Users, Calendar } from "lucide-react";

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </p>
          {user && (
            <div className="mt-2 text-sm text-muted-foreground">
              League Credits: {user.leagueCredits}
            </div>
          )}
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

function LeagueCard({ league, currentUserId }: LeagueCardProps) {
  const router = useRouter();
  const isOwner = league.ownerId === currentUserId;

  const handleLeagueClick = () => {
    router.push(`/leagues/${league.id}`);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    router.push(`/leagues/${league.id}/settings`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-2 hover:border-primary/50"
      onClick={handleLeagueClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{league.name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {isOwner ? "Owner" : "Member"}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Draft {league.isDraftStarted ? "Started" : "Not Started"}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleLeagueClick}
          >
            View League
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
