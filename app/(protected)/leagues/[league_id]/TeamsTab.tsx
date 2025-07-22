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

export function TeamsTab(props: any) {
  // All state and handlers should be passed as props or use the same hooks as before
  // For now, this is a direct copy of the original tab content
  // You can refactor to use props for state/handlers as needed
  return (
    <>
      {/* --- Begin Teams Management Section --- */}
      {props.userLoading || props.teamsLoading ? (
        <div className="flex items-center justify-center min-h-32">
          <div className="text-lg">Loading...</div>
        </div>
      ) : !props.settings ? (
        <div className="container mx-auto p-6">
          <Alert className="max-w-md mx-auto">
            <AlertDescription>League not found.</AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
          {/* Pending Invitations */}
          {props.isOwner && props.pendingInvitations.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Users invited to join your league. Click the trash icon to
                  cancel an invitation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="space-y-2">
                    {props.pendingInvitations.map((invitation: any) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invited{" "}
                              {new Date(
                                invitation.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            Pending
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  props.startCancelInvitation(invitation)
                                }
                                disabled={
                                  props.cancellingInvitation === invitation.id
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {props.cancellingInvitation ===
                                invitation.id ? (
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    League Teams
                  </CardTitle>
                  <CardDescription>
                    {props.teams.length === 0
                      ? "No teams have joined this league yet. Send email invitations or share the league URL for users to join directly."
                      : `${props.teams.length} team${props.teams.length === 1 ? "" : "s"} in this league`}
                  </CardDescription>
                </div>
                {props.isOwner &&
                  props.teams.length < props.settings.leagueSize && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => props.setShowInviteDialog(true)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Invite Users
                      </Button>
                    </div>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              {props.teams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No teams yet</p>
                  <p>Teams will appear here as people join your league</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {props.teams.map((team: any) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {team.name}
                            {team.ownerId === props.settings.ownerId && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {team.ownerFirstName && team.ownerLastName
                              ? `${team.ownerFirstName} ${team.ownerLastName}`
                              : team.ownerEmail || "Unknown Owner"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Budget: ${team.budget}
                          </p>
                        </div>
                      </div>
                      {props.isOwner &&
                        team.ownerId !== props.settings.ownerId && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => props.setDeletingTeam(team.id)}
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
            open={!!props.deletingTeam}
            onOpenChange={() => props.setDeletingTeam(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this team? This action cannot
                  be undone. All team data and roster information will be
                  permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={props.isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={props.handleDeleteTeam}
                  disabled={props.isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {props.isDeleting ? (
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
          <Dialog
            open={props.showInviteDialog}
            onOpenChange={props.setShowInviteDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User to League</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a user. They can accept the
                  invitation and create their own team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {props.inviteError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{props.inviteError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={props.inviteEmail}
                    onChange={(e) => props.setInviteEmail(e.target.value)}
                    placeholder="Enter user's email address"
                    disabled={props.isSendingInvite}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user will receive an invitation email with a link to
                    join your league
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => props.setShowInviteDialog(false)}
                    disabled={props.isSendingInvite}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={props.handleSendInvitation}
                    disabled={
                      props.isSendingInvite || !props.inviteEmail.trim()
                    }
                  >
                    {props.isSendingInvite ? (
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
            open={props.showCancelDialog}
            onOpenChange={props.setShowCancelDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel the invitation to{" "}
                  <strong>{props.invitationToCancel?.email}</strong>?
                  <br />
                  <br />
                  This action cannot be undone. The user will no longer be able
                  to use their invitation link to join the league.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                <AlertDialogAction
                  onClick={props.handleCancelInvitation}
                  disabled={!!props.cancellingInvitation}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {props.cancellingInvitation ? (
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
