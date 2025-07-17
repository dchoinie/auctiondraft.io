"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useLeagueMembership } from "@/hooks/use-league-membership";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { LeagueCreationCTA } from "@/components/LeagueCreationCTA";

export default function Dashboard() {
  const {
    user,
    loading: userLoading,
    error: userError,
    needsProfileCompletion,
    updateProfile,
  } = useCurrentUser();
  const {
    hasLeagues,
    leagues,
    loading: leagueLoading,
    error: leagueError,
  } = useLeagueMembership();

  console.log("Current user:", user);

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
                  <div key={league.id} className="p-4 border rounded-lg">
                    <h3 className="font-medium">{league.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {league.ownerId === user?.id ? "Owner" : "Member"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Draft {league.isDraftStarted ? "Started" : "Not Started"}
                    </p>
                  </div>
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
