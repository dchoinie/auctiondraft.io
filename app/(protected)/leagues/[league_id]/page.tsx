"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueSettings } from "@/stores/leagueStore";
import { useLeagueTeams } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Settings,
  Trophy,
  DollarSign,
  Calendar,
  MapPin,
  Crown,
  UserCheck,
  PlayCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { useState } from "react";

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const leagueId = params.league_id as string;

  const { settings, loading: settingsLoading } = useLeagueSettings(leagueId);
  const { teams, loading: teamsLoading, createTeam } = useLeagueTeams(leagueId);

  // State for join league dialog
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Check if user is league owner
  const isOwner = user?.id === settings?.ownerId;

  // Check if user has a team in this league
  const userTeam = teams.find((team) => team.ownerId === user?.id);

  // Check if league is full
  const isLeagueFull = teams.length === settings.leagueSize;

  // Check if user can join the league
  const canJoinLeague = !isOwner && !userTeam && !isLeagueFull && user?.id;

  // Check if draft can be started
  const canStartDraft = isLeagueFull && isOwner && !settings.isDraftStarted;

  const handleJoinLeague = async () => {
    if (!teamName.trim()) {
      setJoinError("Team name is required");
      return;
    }

    if (!user?.id) {
      setJoinError("You must be logged in to join a league");
      return;
    }

    setIsCreatingTeam(true);
    setJoinError(null);

    try {
      const success = await createTeam({
        name: teamName.trim(),
        ownerId: user.id,
      });

      if (success) {
        setShowJoinDialog(false);
        setTeamName("");
      }
    } catch (error) {
      setJoinError("Failed to create team. Please try again.");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  if (userLoading || settingsLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading league...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <AlertDescription>League not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            {settings.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isOwner ? "Your League" : "League Member"}
          </p>
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/leagues/${leagueId}/teams`)}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Teams
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/leagues/${leagueId}/settings`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </>
          )}

          {canStartDraft && (
            <Button>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Draft
            </Button>
          )}
        </div>
      </div>

      {/* League Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="text-2xl font-bold">
                  {teams.length} / {settings.leagueSize}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">${settings.startingBudget}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Roster Size</p>
                <p className="text-2xl font-bold">{settings.rosterSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">
                  {settings.isDraftStarted
                    ? "Draft Started"
                    : isLeagueFull
                    ? "Ready"
                    : "Filling"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Draft Information */}
      {settings.draftDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Draft Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(settings.draftDate).toLocaleDateString()}
                {settings.draftTime && ` at ${settings.draftTime}`}
              </span>
            </div>
            {settings.draftLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{settings.draftLocation}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Join League Section (for users without a team) */}
      {canJoinLeague && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join This League
            </CardTitle>
            <CardDescription>
              Create your team and join the league! There{" "}
              {isLeagueFull ? "are" : "is"} {settings.leagueSize - teams.length}{" "}
              spot{settings.leagueSize - teams.length === 1 ? "" : "s"}{" "}
              remaining.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Ready to draft?</p>
                <p className="text-sm text-muted-foreground">
                  Starting budget: ${settings.startingBudget} | Roster size:{" "}
                  {settings.rosterSize}
                </p>
              </div>
              <Button
                onClick={() => setShowJoinDialog(true)}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Join League
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Team (if they have one) */}
      {userTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {userTeam.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{userTeam.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Budget: ${userTeam.budget}
                  </p>
                </div>
              </div>
              <Button variant="outline">View Roster</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                League Teams
              </CardTitle>
              <CardDescription>
                {teams.length === 0
                  ? "No teams have joined this league yet"
                  : `${teams.length} team${
                      teams.length === 1 ? "" : "s"
                    } in this league`}
              </CardDescription>
            </div>

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/leagues/${leagueId}/teams`)}
              >
                Manage Teams
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No teams yet</p>
              <p>Teams will appear here as people join your league</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      {team.name}
                      {team.ownerId === settings.ownerId && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {team.ownerFirstName && team.ownerLastName
                        ? `${team.ownerFirstName} ${team.ownerLastName}`
                        : team.ownerEmail || "Unknown Owner"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${team.budget}</p>
                    <p className="text-xs text-muted-foreground">Budget</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* League Readiness */}
      {!isLeagueFull && (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertDescription>
            Waiting for {settings.leagueSize - teams.length} more team
            {settings.leagueSize - teams.length === 1 ? "" : "s"} to join before
            the draft can begin.
            {isOwner &&
              " Share invitation links or manually add teams to fill your league."}
          </AlertDescription>
        </Alert>
      )}

      {canStartDraft && (
        <Alert className="border-green-200 bg-green-50">
          <PlayCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your league is full and ready for the draft! You can now start the
            live auction draft.
          </AlertDescription>
        </Alert>
      )}

      {/* Join League Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join League</DialogTitle>
            <DialogDescription>
              Enter a name for your team to join this league.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="team-name" className="text-right">
                Team Name
              </Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="col-span-3"
              />
            </div>
            {joinError && <p className="text-red-500 text-sm">{joinError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinLeague} disabled={isCreatingTeam}>
              {isCreatingTeam ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isCreatingTeam ? "Joining..." : "Join League"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
