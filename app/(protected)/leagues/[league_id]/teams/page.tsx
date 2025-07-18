"use client";

/**
 * Teams Management Page
 *
 * This page allows league owners to manage teams in two ways:
 * 1. Invitations: Send invitation emails to users who can then create their own teams
 * 2. Self-Registration: Users can join the league directly from the league page
 *
 * Additional features:
 * - View all pending invitations with cancel option
 * - Delete teams (except league owner's team)
 * - See team budget and owner information
 */

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Crown,
  DollarSign,
  UserCheck,
  AlertCircle,
  Loader2,
  Mail,
  Link,
  Copy,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Invitation {
  id: string;
  leagueId: string;
  email: string;
  status: string;
  createdAt: string;
}

export default function TeamsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const leagueId = params.league_id as string;

  const { settings, loading: settingsLoading } = useLeagueSettings(leagueId);
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
    deleteTeam,
  } = useLeagueTeams(leagueId);

  // State for delete confirmation
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for invitations
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // State for cancelling invitations
  const [cancellingInvitation, setCancellingInvitation] = useState<
    string | null
  >(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [invitationToCancel, setInvitationToCancel] =
    useState<Invitation | null>(null);

  // State for copying league URL
  const [isUrlCopied, setIsUrlCopied] = useState(false);

  // Check if user is league owner
  const isOwner = user?.id === settings?.ownerId;

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;

    setIsDeleting(true);
    try {
      const success = await deleteTeam(deletingTeam);
      if (success) {
        setDeletingTeam(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Invitation functions
  const fetchPendingInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/invite`);
      const data = await response.json();

      if (data.success) {
        setPendingInvitations(
          data.invitations.filter((inv: Invitation) => inv.status === "pending")
        );
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }

    setIsSendingInvite(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setShowInviteDialog(false);
        setInviteEmail("");
        fetchPendingInvitations(); // Refresh invitations

        // Show success message
        alert(
          `Invitation email sent to ${inviteEmail.trim()}! They will receive an email with a link to join the league.`
        );
      } else {
        setInviteError(data.error || "Failed to send invitation");
      }
    } catch (error) {
      setInviteError("Failed to send invitation. Please try again.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    setCancellingInvitation(invitationToCancel.id);

    try {
      const response = await fetch(
        `/api/leagues/${leagueId}/invitations/${invitationToCancel.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        // Remove the cancelled invitation from local state
        setPendingInvitations((prev) =>
          prev.filter((inv) => inv.id !== invitationToCancel.id)
        );

        setShowCancelDialog(false);
        setInvitationToCancel(null);

        // Show success message
        alert(`Invitation to ${invitationToCancel.email} has been cancelled.`);
      } else {
        alert(`Failed to cancel invitation: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to cancel invitation. Please try again.");
    } finally {
      setCancellingInvitation(null);
    }
  };

  const startCancelInvitation = (invitation: Invitation) => {
    setInvitationToCancel(invitation);
    setShowCancelDialog(true);
  };

  // Load pending invitations when component mounts
  useEffect(() => {
    if (isOwner) {
      fetchPendingInvitations();
    }
  }, [isOwner, leagueId]);

  if (userLoading || settingsLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
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
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/leagues/${leagueId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to League
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">{settings.name} - Teams</h1>
          <p className="text-muted-foreground mt-2">
            Manage teams and league membership
          </p>
        </div>

        {teamsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{teamsError}</AlertDescription>
          </Alert>
        )}

        {/* League Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-sm text-muted-foreground">
                    Starting Budget
                  </p>
                  <p className="text-2xl font-bold">
                    ${settings.startingBudget}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">League Status</p>
                  <p className="text-lg font-semibold">
                    {teams.length === settings.leagueSize ? "Full" : "Open"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invitations */}
        {isOwner && pendingInvitations.length > 0 && (
          <Card>
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
                  {pendingInvitations.map((invitation) => (
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
                              onClick={() => startCancelInvitation(invitation)}
                              disabled={cancellingInvitation === invitation.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                    ? "No teams have joined this league yet. Send email invitations or share the league URL for users to join directly."
                    : `${teams.length} team${
                        teams.length === 1 ? "" : "s"
                      } in this league`}
                </CardDescription>
              </div>

              {isOwner && teams.length < settings.leagueSize && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Users
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const leagueUrl = `${window.location.origin}/leagues/${leagueId}`;
                            try {
                              await navigator.clipboard.writeText(leagueUrl);
                              setIsUrlCopied(true);
                              setTimeout(() => setIsUrlCopied(false), 2000);
                            } catch (error) {
                              console.error("Failed to copy URL:", error);
                            }
                          }}
                        >
                          {isUrlCopied ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <Link className="h-4 w-4 mr-2" />
                          )}
                          {isUrlCopied ? "Copied!" : "Copy League URL"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Copy a shareable link to send via text, social media,
                          or other platforms
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
              <div className="space-y-4">
                {teams.map((team) => (
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
                          {team.ownerId === settings.ownerId && (
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

                    {isOwner && team.ownerId !== settings.ownerId && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
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
      </div>

      {/* Delete Team Confirmation */}
      <AlertDialog
        open={!!deletingTeam}
        onOpenChange={() => setDeletingTeam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this team? This action cannot be
              undone. All team data and roster information will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User to League</DialogTitle>
            <DialogDescription>
              Send an invitation email to a user. They can accept the invitation
              and create their own team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {inviteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter user's email address"
                disabled={isSendingInvite}
              />
              <p className="text-xs text-muted-foreground">
                The user will receive an invitation email with a link to join
                your league
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={isSendingInvite}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitation}
                disabled={isSendingInvite || !inviteEmail.trim()}
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
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{" "}
              <strong>{invitationToCancel?.email}</strong>?
              <br />
              <br />
              This action cannot be undone. The user will no longer be able to
              use their invitation link to join the league.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={!!cancellingInvitation}
              className="bg-red-600 hover:bg-red-700"
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
  );
}
