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
import { Users, Crown, Mail, Trash2, Loader2, AlertCircle } from "lucide-react";
import React from "react";
import { LeagueSettings } from "@/stores/leagueStore";
import { Team } from "@/stores/teamStore";
import { Invitation } from "@/lib/email";

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
  return (
    <>
      {/* --- Begin Teams Management Section --- */}
      {userLoading || teamsLoading ? (
        <div className="flex items-center justify-center min-h-32">
          <div className="text-lg text-gray-200">Loading...</div>
        </div>
      ) : !settings ? (
        <div className="container mx-auto p-6">
          <Alert className="max-w-md mx-auto bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700 text-gray-100">
            <AlertDescription>League not found.</AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
          {/* Pending Invitations */}
          {isOwner && pendingInvitations.length > 0 && (
            <Card className="mb-6 bg-gradient-to-br from-emerald-900/80 to-gray-900/80 border-2 border-emerald-800 shadow-xl">
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
          <Card className="bg-gradient-to-br from-gray-900/90 to-emerald-950/80 border-2 border-gray-800 shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-emerald-200">
                    <Users className="h-5 w-5" />
                    League Teams
                  </CardTitle>
                  <CardDescription className="text-emerald-100/80">
                    {teams.length === 0
                      ? "No teams have joined this league yet. Send email invitations or share the league URL for users to join directly."
                      : `${teams.length} team${teams.length === 1 ? "" : "s"} in this league`}
                  </CardDescription>
                </div>
                {isOwner && teams.length < settings.leagueSize && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-emerald-700 text-emerald-200 hover:bg-emerald-900/40"
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
                      className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-950/70 hover:bg-emerald-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-purple-900 rounded-full flex items-center justify-center text-white font-bold">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2 text-emerald-100">
                            {team.name}
                            {team.ownerId === settings.ownerId && (
                              <Crown className="h-4 w-4 text-yellow-400" />
                            )}
                          </h3>
                          <p className="text-sm text-emerald-200/80">
                            {team.ownerFirstName && team.ownerLastName
                              ? `${team.ownerFirstName} ${team.ownerLastName}`
                              : team.ownerEmail || "Unknown Owner"}
                          </p>
                          <p className="text-xs text-emerald-200/60">
                            Budget: ${team.budget}
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
                <DialogDescription>
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
                    className="border-gray-700 text-emerald-200 hover:bg-gray-800/40"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvitation}
                    disabled={isSendingInvite || !inviteEmail.trim()}
                    className="bg-emerald-800 text-emerald-100 hover:bg-emerald-900"
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
