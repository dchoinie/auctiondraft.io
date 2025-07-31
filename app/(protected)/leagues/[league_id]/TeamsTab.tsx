import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Crown, Mail, Trash2, Loader2, AlertCircle, Plus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { LeagueSettings } from "@/stores/leagueStore";
import { Team, useLeagueTeams } from "@/stores/teamStore";
import { Invitation } from "@/lib/email";
import { useUser } from "@/stores/userStore";
import { useOfflineTeamStore, OfflineTeam } from "@/stores/offlineTeamStore";

interface TeamsTabProps {
  cancellingInvitation: string | null;
  deletingTeam: string | null;
  handleCancelInvitation: () => void;
  handleDeleteTeam: () => void;
  handleSendInvitation: () => void;
  invitationToCancel: Invitation;
  inviteEmail: string;
  inviteError: string | null;
  isDeleting: boolean;
  isOwner: boolean;
  isSendingInvite: boolean;
  pendingInvitations: Invitation[];
  setDeletingTeam: (teamId: string | null) => void;
  setInviteEmail: (email: string) => void;
  setShowCancelDialog: (show: boolean) => void;
  setShowInviteDialog: (show: boolean) => void;
  settings?: LeagueSettings;
  showCancelDialog: boolean;
  showInviteDialog: boolean;
  startCancelInvitation: (invitation: Invitation) => void;
  teams: Team[];
  teamsLoading: boolean;
  userLoading: boolean;
}

export function TeamsTab(props: TeamsTabProps) {
  const {
    cancellingInvitation,
    deletingTeam,
    handleCancelInvitation,
    handleDeleteTeam,
    handleSendInvitation,
    invitationToCancel,
    inviteEmail,
    inviteError,
    isDeleting,
    isOwner,
    isSendingInvite,
    pendingInvitations,
    setDeletingTeam,
    setInviteEmail,
    setShowCancelDialog,
    setShowInviteDialog,
    settings,
    showCancelDialog,
    showInviteDialog,
    startCancelInvitation,
    teams,
    teamsLoading,
    userLoading,
  } = props;

  const { user } = useUser();
  const { createTeam } = useLeagueTeams(settings?.id);
  const { 
    teams: offlineTeams, 
    loading: offlineTeamsLoading, 
    error: offlineTeamsError,
    fetchTeams: fetchOfflineTeams,
    createTeam: createOfflineTeam,
    deleteTeam: deleteOfflineTeam
  } = useOfflineTeamStore();

  // Team creation state
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  // Offline team creation state
  const [showCreateOfflineTeamDialog, setShowCreateOfflineTeamDialog] = useState(false);
  const [offlineTeamName, setOfflineTeamName] = useState("");
  const [offlineTeamBudget, setOfflineTeamBudget] = useState(settings?.startingBudget || 200);
  const [isCreatingOfflineTeam, setIsCreatingOfflineTeam] = useState(false);
  const [createOfflineTeamError, setCreateOfflineTeamError] = useState<string | null>(null);

  // Check if current user has a team in this league (for live mode)
  const userHasTeam = teams.some(team => team.ownerId === user?.id);

  // Check if league is in offline mode
  const isOfflineMode = settings?.draftMode === "offline";

  // Fetch offline teams when in offline mode
  useEffect(() => {
    if (isOfflineMode && settings?.id) {
      fetchOfflineTeams(settings.id);
    }
  }, [isOfflineMode, settings?.id, fetchOfflineTeams]);

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !user?.id) {
      setCreateTeamError("Team name is required");
      return;
    }

    setIsCreatingTeam(true);
    setCreateTeamError(null);

    try {
      const success = await createTeam({
        name: teamName.trim(),
        ownerId: user.id,
      });

      if (success) {
        setShowCreateTeamDialog(false);
        setTeamName("");
        // Show success message
        alert("Team created successfully!");
      } else {
        setCreateTeamError("Failed to create team. Please try again.");
      }
    } catch (error) {
      setCreateTeamError("An unexpected error occurred. Please try again.");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleCreateOfflineTeam = async () => {
    if (!offlineTeamName.trim()) {
      setCreateOfflineTeamError("Team name is required");
      return;
    }

    if (!offlineTeamBudget || offlineTeamBudget <= 0) {
      setCreateOfflineTeamError("Valid budget is required");
      return;
    }

    setIsCreatingOfflineTeam(true);
    setCreateOfflineTeamError(null);

    try {
      const success = await createOfflineTeam(settings?.id || "", {
        name: offlineTeamName.trim(),
        budget: offlineTeamBudget,
      });

      if (success) {
        setShowCreateOfflineTeamDialog(false);
        setOfflineTeamName("");
        setOfflineTeamBudget(settings?.startingBudget || 200);
        // Show success message
        alert("Offline team created successfully!");
      } else {
        setCreateOfflineTeamError("Failed to create offline team. Please try again.");
      }
    } catch (error) {
      setCreateOfflineTeamError("An unexpected error occurred. Please try again.");
    } finally {
      setIsCreatingOfflineTeam(false);
    }
  };

  return (
    <>
      {/* Debug Info - Remove this after fixing */}
      <div className="mb-4 p-3 bg-gray-800 border border-gray-600 rounded">
        <p className="text-sm text-gray-300">
          <strong>Debug Info:</strong> Draft Mode: {settings?.draftMode || "not set"} | 
          Is Offline Mode: {isOfflineMode ? "Yes" : "No"}
        </p>
      </div>

      {/* --- Begin Teams Management Section --- */}
      {userLoading || teamsLoading ? (
        <div className="flex items-center justify-center min-h-32">
          <div className="text-lg text-gray-200">Loading...</div>
        </div>
      ) : !settings ? (
        <div className="container mx-auto p-6">
          <Alert className="max-w-md mx-auto text-gray-100">
            <AlertDescription>League not found.</AlertDescription>
          </Alert>
        </div>
      ) : isOfflineMode ? (
        // Offline Draft Mode UI
        <div className="space-y-6">
          {/* Offline Teams Management */}
          <Card className="bg-gradient-to-br from-blue-900/90 to-gray-900/90 border-2 border-blue-800 text-blue-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-blue-300">
                    <Users className="h-5 w-5" />
                    Offline Teams
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {offlineTeams.length === 0
                      ? "No offline teams have been created yet. Add teams for the offline draft."
                      : `${offlineTeams.length} team${offlineTeams.length === 1 ? "" : "s"} in this offline draft`}
                  </CardDescription>
                </div>
                {isOwner && offlineTeams.length < (settings.leagueSize || 10) && (
                  <Button
                    onClick={() => setShowCreateOfflineTeamDialog(true)}
                    className="bg-gradient-to-br from-blue-800/80 to-blue-600/80 border-2 border-blue-400 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {offlineTeamsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading offline teams...</span>
                </div>
              ) : offlineTeamsError ? (
                <Alert variant="destructive" className="bg-red-900/80 border-red-700 text-red-100">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{offlineTeamsError}</AlertDescription>
                </Alert>
              ) : offlineTeams.length === 0 ? (
                <div className="text-center py-8 text-blue-100/70">
                  <Users className="h-12 w-12 mx-auto mb-4 text-blue-900/60" />
                  <p className="text-lg font-medium">No offline teams yet</p>
                  <p>Add teams to get started with the offline draft</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offlineTeams.map((team: OfflineTeam) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-900/80 border-gray-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-2 border-blue-400 shadow-md hover:shadow-xl rounded-full flex items-center justify-center text-white font-bold">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2 text-blue-300 leading-none">
                            {team.name}
                            {team.isAdmin && (
                              <Crown className="h-4 w-4 text-yellow-400" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-300 tracking-wide">
                            Budget: ${team.budget} • Draft Order: {team.draftOrder || "TBD"}
                            {team.isAdmin && " • Admin Team"}
                          </p>
                        </div>
                      </div>
                      {isOwner && !team.isAdmin && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                            onClick={() => deleteOfflineTeam(team.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Offline Team Dialog */}
          <Dialog open={showCreateOfflineTeamDialog} onOpenChange={setShowCreateOfflineTeamDialog}>
            <DialogContent className="bg-gradient-to-br from-blue-900/90 to-gray-900/90 border-2 border-blue-400 text-blue-100">
              <DialogHeader>
                <DialogTitle>Add Offline Team</DialogTitle>
                <DialogDescription className="text-blue-200">
                  Add a team for the offline draft. This team will participate in the draft without needing a user account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {createOfflineTeamError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-900/80 border-red-700 text-red-100"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{createOfflineTeamError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="offline-team-name" className="text-blue-200">
                    Team Name
                  </Label>
                  <Input
                    id="offline-team-name"
                    type="text"
                    value={offlineTeamName}
                    onChange={(e) => setOfflineTeamName(e.target.value)}
                    placeholder="Enter team name"
                    disabled={isCreatingOfflineTeam}
                    className="bg-gray-900/80 border-gray-700 text-blue-100 placeholder:text-blue-200/50"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offline-team-budget" className="text-blue-200">
                    Starting Budget ($)
                  </Label>
                  <Input
                    id="offline-team-budget"
                    type="number"
                    value={offlineTeamBudget}
                    onChange={(e) => setOfflineTeamBudget(Number(e.target.value))}
                    placeholder="Enter starting budget"
                    disabled={isCreatingOfflineTeam}
                    className="bg-gray-900/80 border-gray-700 text-blue-100 placeholder:text-blue-200/50"
                    min={1}
                    max={1000}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateOfflineTeamDialog(false)}
                    disabled={isCreatingOfflineTeam}
                    className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateOfflineTeam}
                    disabled={isCreatingOfflineTeam || !offlineTeamName.trim() || offlineTeamBudget <= 0}
                    className="bg-gradient-to-br from-blue-800/80 to-blue-600/80 border-2 border-blue-400 shadow-md hover:shadow-xl hover:text-gray-300"
                  >
                    {isCreatingOfflineTeam ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <>
          {/* Admin Team Creation Section */}
          {isOwner && !userHasTeam && (
            <Card className="mb-6 bg-gradient-to-br from-yellow-900/90 to-yellow-700/90 border-2 border-yellow-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-200">
                  <Crown className="h-5 w-5" />
                  Create Your Team
                </CardTitle>
                <CardDescription className="text-yellow-100/80">
                  As the league admin, you need to create your own team to participate in the league.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 mb-2">
                      You haven&apos;t created your team yet. Click the button below to create your team and start participating in the league.
                    </p>
                    <p className="text-sm text-yellow-200/70">
                      Starting budget: ${settings.startingBudget || 200}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateTeamDialog(true)}
                    className="bg-gradient-to-br from-yellow-800/80 to-yellow-600/80 border-2 border-yellow-300 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create My Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {isOwner && pendingInvitations.length > 0 && (
            <Card className="mb-6 green-bg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-200">
                  <Mail className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
                <CardDescription className="text-emerald-100/80">
                  Users invited to join your league. Click the trash icon to
                  cancel an invitation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation: Invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 border border-emerald-900 rounded-lg bg-emerald-950/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-900/80 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-emerald-100">
                              {invitation.email}
                            </p>
                            <p className="text-sm text-emerald-200/70">
                              Invited{" "}
                              {new Date(
                                invitation.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 bg-yellow-900/80 text-yellow-300 rounded">
                            Pending
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  startCancelInvitation(invitation)
                                }
                                disabled={
                                  cancellingInvitation === invitation.id
                                }
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                              >
                                {cancellingInvitation === invitation.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancel invitation</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          )}
          {/* Teams List */}
          <Card className="bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-emerald-300">
                    <Users className="h-5 w-5" />
                    League Teams
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {teams.length === 0
                      ? "No teams have joined this league yet. Send email invitations or share the league URL for users to join directly."
                      : `${teams.length} team${teams.length === 1 ? "" : "s"} in this league`}
                  </CardDescription>
                </div>
                {isOwner && teams.length < (settings.leagueSize || 10) && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Invite Users
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8 text-emerald-100/70">
                  <Users className="h-12 w-12 mx-auto mb-4 text-emerald-900/60" />
                  <p className="text-lg font-medium">No teams yet</p>
                  <p>Teams will appear here as people join your league</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team: Team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-900/80 border-gray-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl rounded-full flex items-center justify-center text-white font-bold">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2 text-emerald-300 leading-none">
                            {team.name}
                            {team.ownerId === settings.ownerId && (
                              <Crown className="h-4 w-4 text-yellow-400" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-300 tracking-wide">
                            {team.ownerFirstName && team.ownerLastName
                              ? `${team.ownerFirstName} ${team.ownerLastName}`
                              : team.ownerEmail || "Unknown Owner"}
                          </p>
                        </div>
                      </div>
                      {isOwner && team.ownerId !== settings.ownerId && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                            onClick={() => setDeletingTeam(team.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Team Dialog */}
          <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
            <DialogContent className="bg-gradient-to-br from-yellow-900/90 to-gray-900/90 border-2 border-yellow-400 text-yellow-100">
              <DialogHeader>
                <DialogTitle>Create Your Team</DialogTitle>
                <DialogDescription className="text-yellow-200">
                  Choose a name for your team. This will be your team&apos;s identity in the league.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {createTeamError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-900/80 border-red-700 text-red-100"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{createTeamError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="text-yellow-200">
                    Team Name
                  </Label>
                  <Input
                    id="team-name"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    disabled={isCreatingTeam}
                    className="bg-gray-900/80 border-gray-700 text-yellow-100 placeholder:text-yellow-200/50"
                    maxLength={50}
                  />
                  <p className="text-xs text-yellow-200/70">
                    Your team will start with ${settings?.startingBudget || 200} budget
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateTeamDialog(false)}
                    disabled={isCreatingTeam}
                    className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTeam}
                    disabled={isCreatingTeam || !teamName.trim()}
                    className="bg-gradient-to-br from-yellow-800/80 to-yellow-600/80 border-2 border-yellow-300 shadow-md hover:shadow-xl hover:text-gray-300"
                  >
                    {isCreatingTeam ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Team
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Team Confirmation */}
          <AlertDialog
            open={!!deletingTeam}
            onOpenChange={() => setDeletingTeam(null)}
          >
            <AlertDialogContent className="bg-gradient-to-br from-gray-900/90 to-emerald-950/90 border-2 border-gray-800 text-emerald-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this team? This action cannot
                  be undone. All team data and roster information will be
                  permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeleting}
                  className="bg-gray-800 text-gray-200 border-gray-700"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTeam}
                  disabled={isDeleting}
                  className="bg-red-700 text-red-100 hover:bg-red-800"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Team"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Send Invitation Dialog */}
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent className="bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100">
              <DialogHeader>
                <DialogTitle>Invite User to League</DialogTitle>
                <DialogDescription className="text-gray-200">
                  Send an invitation email to a user. They can accept the
                  invitation and create their own team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {inviteError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-900/80 border-red-700 text-red-100"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{inviteError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="invite-email" className="text-emerald-200">
                    Email Address
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter user's email address"
                    disabled={isSendingInvite}
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                  />
                  <p className="text-xs text-emerald-200/70">
                    The user will receive an invitation email with a link to
                    join your league
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                    disabled={isSendingInvite}
                    className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvitation}
                    disabled={isSendingInvite || !inviteEmail.trim()}
                    className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl hover:text-gray-300"
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* Cancel Invitation Confirmation Dialog */}
          <AlertDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
          >
            <AlertDialogContent className="bg-gradient-to-br from-gray-900/90 to-emerald-950/90 border-2 border-gray-800 text-emerald-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel the invitation to{" "}
                  <strong>{invitationToCancel?.email}</strong>?
                  <br />
                  <br />
                  This action cannot be undone. The user will no longer be able
                  to use their invitation link to join the league.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-800 text-gray-200 border-gray-700">
                  Keep Invitation
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancelInvitation}
                  disabled={!!cancellingInvitation}
                  className="bg-red-700 text-red-100 hover:bg-red-800"
                >
                  {cancellingInvitation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Invitation"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {/* --- End Teams Management Section --- */}
    </>
  );
} 