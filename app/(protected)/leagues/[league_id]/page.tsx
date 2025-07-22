/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { League, useLeagueStore } from "@/stores/leagueStore";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueTeams } from "@/stores/teamStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface Tab {
  value: string;
  label: string;
}

const tabs: Tab[] = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "teams",
    label: "Teams",
  },
  {
    value: "roster",
    label: "Roster",
  },
  {
    value: "settings",
    label: "Settings",
  },
];

export default function LeaguePage() {
  const { league_id } = useParams();
  const { leagues, fetchLeagues } = useLeagueStore();
  const league = leagues.find((league: League) => league.id === league_id);

  const [localSettings, setLocalSettings] = useState(league?.settings || null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update localSettings when league changes
  useEffect(() => {
    if (league?.settings) {
      setLocalSettings(league.settings);
    }
  }, [league]);

  // Helper to check if form is dirty
  const isDirty = useMemo(() => {
    if (!league?.settings || !localSettings) return false;
    return JSON.stringify(league.settings) !== JSON.stringify(localSettings);
  }, [league, localSettings]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, [field]: value });
  };

  // Update settings handler
  const handleUpdateSettings = async () => {
    if (!league || !localSettings) return;
    setSaving(true);
    setError(null);
    try {
      const success = await useLeagueStore
        .getState()
        .updateLeagueSettings(league.id, localSettings);
      if (success) {
        setSuccessMessage("Settings updated successfully!");
        fetchLeagues(); // Refetch league data after update
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError("Failed to update settings.");
      }
    } catch (err) {
      setError("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (leagues.length === 0) {
      fetchLeagues();
    }
  }, [leagues, fetchLeagues]);

  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  // Use league_id from params and league from store
  const leagueId = league_id as string;
  // Use league as settings
  const settings = league?.settings;
  const isOwner = user?.id === settings?.ownerId;
  // Teams state/logic
  const {
    teams = [],
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
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  // State for cancelling invitations
  const [cancellingInvitation, setCancellingInvitation] = useState<
    string | null
  >(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<any | null>(
    null
  );
  // State for copying league URL
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  // Invitation functions
  const fetchPendingInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/invite`);
      const data = await response.json();
      if (data.success) {
        setPendingInvitations(
          data.invitations.filter((inv: any) => inv.status === "pending")
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
        fetchPendingInvitations();
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
        setPendingInvitations((prev) =>
          prev.filter((inv) => inv.id !== invitationToCancel.id)
        );
        setShowCancelDialog(false);
        setInvitationToCancel(null);
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
  const startCancelInvitation = (invitation: any) => {
    setInvitationToCancel(invitation);
    setShowCancelDialog(true);
  };
  // Load pending invitations when component mounts
  useEffect(() => {
    if (isOwner) {
      fetchPendingInvitations();
    }
  }, [isOwner, leagueId]);
  // Delete team handler
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

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-50 text-center mb-6">
        {league?.name}
      </h2>
      <Tabs defaultValue="draft">
        {/* Center the TabsList */}
        <div className="flex justify-center">
          <TabsList className="font-exo2">
            {tabs.map((tab: Tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xl"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {/* TabsContent stretches full width */}
        <TabsContent value="draft" className="mt-6">
          Draft
        </TabsContent>
        <TabsContent value="teams" className="mt-6">
          {/* --- Begin Teams Management Section --- */}
          {userLoading || teamsLoading ? (
            <div className="flex items-center justify-center min-h-32">
              <div className="text-lg">Loading...</div>
            </div>
          ) : !settings ? (
            <div className="container mx-auto p-6">
              <Alert className="max-w-md mx-auto">
                <AlertDescription>League not found.</AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              {/* Pending Invitations */}
              {isOwner && pendingInvitations.length > 0 && (
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
                                <p className="font-medium">
                                  {invitation.email}
                                </p>
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
                                      startCancelInvitation(invitation)
                                    }
                                    disabled={
                                      cancellingInvitation === invitation.id
                                    }
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
                          : `${teams.length} team${teams.length === 1 ? "" : "s"} in this league`}
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
              {/* Delete Team Confirmation */}
              <AlertDialog
                open={!!deletingTeam}
                onOpenChange={() => setDeletingTeam(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Team</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this team? This action
                      cannot be undone. All team data and roster information
                      will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
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
              <Dialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
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
                        The user will receive an invitation email with a link to
                        join your league
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
              <AlertDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel the invitation to{" "}
                      <strong>{invitationToCancel?.email}</strong>?
                      <br />
                      <br />
                      This action cannot be undone. The user will no longer be
                      able to use their invitation link to join the league.
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
          )}
          {/* --- End Teams Management Section --- */}
        </TabsContent>
        <TabsContent value="roster" className="mt-6">
          Roster
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          {localSettings ? (
            <div className="space-y-6">
              {successMessage && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-50" htmlFor="league-name">
                    League Name
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="league-name"
                    value={localSettings.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="league-size">
                    League Size
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="league-size"
                    type="number"
                    min="6"
                    max="20"
                    value={localSettings.leagueSize}
                    onChange={(e) =>
                      handleInputChange("leagueSize", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-50" htmlFor="starting-budget">
                  Starting Budget ($)
                </Label>
                <Input
                  className="bg-gray-50"
                  id="starting-budget"
                  type="number"
                  min="100"
                  max="1000"
                  value={localSettings.startingBudget}
                  onChange={(e) =>
                    handleInputChange(
                      "startingBudget",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
              {/* Draft Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-50" htmlFor="draft-date">
                    Draft Date
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="draft-date"
                    type="date"
                    value={localSettings.draftDate || ""}
                    onChange={(e) =>
                      handleInputChange("draftDate", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="draft-time">
                    Draft Time
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="draft-time"
                    type="time"
                    value={localSettings.draftTime || ""}
                    onChange={(e) =>
                      handleInputChange("draftTime", e.target.value)
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-50" htmlFor="draft-location">
                  Draft Location
                </Label>
                <Textarea
                  className="bg-gray-50"
                  id="draft-location"
                  placeholder="Enter draft location or online platform details..."
                  value={localSettings.draftLocation || ""}
                  onChange={(e) =>
                    handleInputChange("draftLocation", e.target.value)
                  }
                  rows={3}
                />
              </div>
              {/* Nomination Type */}
              <div className="space-y-3">
                <Label className="text-gray-50">Nomination Type</Label>
                <div className="flex items-center space-x-4">
                  <label className="text-gray-50 flex items-center space-x-2">
                    <input
                      className="bg-gray-50"
                      type="radio"
                      id="linear"
                      name="draftType"
                      value="linear"
                      checked={
                        (localSettings.draftType || "linear") === "linear"
                      }
                      onChange={(e) =>
                        handleInputChange("draftType", e.target.value)
                      }
                    />
                    <span>Linear</span>
                  </label>
                  <label className="text-gray-50 flex items-center space-x-2">
                    <input
                      className="bg-gray-50"
                      type="radio"
                      id="snake"
                      name="draftType"
                      value="snake"
                      checked={
                        (localSettings.draftType || "linear") === "snake"
                      }
                      onChange={(e) =>
                        handleInputChange("draftType", e.target.value)
                      }
                    />
                    <span>Snake</span>
                  </label>
                </div>
              </div>
              {/* Timer Settings */}
              <div className="space-y-3">
                <Label className="text-gray-50">Auction Timer</Label>
                <div className="flex items-center space-x-2">
                  <input
                    className="bg-gray-50"
                    type="checkbox"
                    id="timer-enabled"
                    checked={(localSettings.timerEnabled || 0) === 1}
                    onChange={(e) =>
                      handleInputChange(
                        "timerEnabled",
                        e.target.checked ? 1 : 0
                      )
                    }
                  />
                  <Label
                    className="text-gray-50 font-normal"
                    htmlFor="timer-enabled"
                  >
                    Enable nomination timer
                  </Label>
                </div>
                {(localSettings.timerEnabled || 0) === 1 && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-gray-50" htmlFor="timer-duration">
                      Timer Duration (seconds)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        className="bg-gray-50 w-24"
                        id="timer-duration"
                        type="number"
                        min="30"
                        max="300"
                        value={localSettings.timerDuration || 60}
                        onChange={(e) =>
                          handleInputChange(
                            "timerDuration",
                            parseInt(e.target.value)
                          )
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        ({Math.floor((localSettings.timerDuration || 60) / 60)}:
                        {String(
                          (localSettings.timerDuration || 60) % 60
                        ).padStart(2, "0")}{" "}
                        minutes)
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Roster Settings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-50" htmlFor="qb-slots">
                    QB
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="qb-slots"
                    type="number"
                    min="0"
                    max="5"
                    value={localSettings.qbSlots}
                    onChange={(e) =>
                      handleInputChange("qbSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="rb-slots">
                    RB
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="rb-slots"
                    type="number"
                    min="0"
                    max="5"
                    value={localSettings.rbSlots}
                    onChange={(e) =>
                      handleInputChange("rbSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="wr-slots">
                    WR
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="wr-slots"
                    type="number"
                    min="0"
                    max="5"
                    value={localSettings.wrSlots}
                    onChange={(e) =>
                      handleInputChange("wrSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="te-slots">
                    TE
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="te-slots"
                    type="number"
                    min="0"
                    max="3"
                    value={localSettings.teSlots}
                    onChange={(e) =>
                      handleInputChange("teSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="flex-slots">
                    FLEX
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="flex-slots"
                    type="number"
                    min="0"
                    max="3"
                    value={localSettings.flexSlots}
                    onChange={(e) =>
                      handleInputChange("flexSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="dst-slots">
                    D/ST
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="dst-slots"
                    type="number"
                    min="0"
                    max="2"
                    value={localSettings.dstSlots}
                    onChange={(e) =>
                      handleInputChange("dstSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="k-slots">
                    K
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="k-slots"
                    type="number"
                    min="0"
                    max="2"
                    value={localSettings.kSlots}
                    onChange={(e) =>
                      handleInputChange("kSlots", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="bench-slots">
                    Bench
                  </Label>
                  <Input
                    className="bg-gray-50"
                    id="bench-slots"
                    type="number"
                    min="1"
                    max="15"
                    value={localSettings.benchSlots}
                    onChange={(e) =>
                      handleInputChange("benchSlots", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  Total Roster Size:{" "}
                  {localSettings.qbSlots +
                    localSettings.rbSlots +
                    localSettings.wrSlots +
                    localSettings.teSlots +
                    localSettings.flexSlots +
                    localSettings.dstSlots +
                    localSettings.kSlots +
                    localSettings.benchSlots}{" "}
                  players
                </p>
              </div>
              {/* Update Button */}
              <div className="flex justify-end pt-6">
                <Button
                  onClick={handleUpdateSettings}
                  disabled={!isDirty || saving}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Updating..." : "Update Settings"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No league settings found.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
