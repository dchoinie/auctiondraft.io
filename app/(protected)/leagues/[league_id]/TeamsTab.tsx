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
import { Users, Crown, Mail, Trash2, Loader2, AlertCircle, Plus, GripVertical, Eye, Shuffle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { LeagueSettings } from "@/stores/leagueStore";
import { Team, useLeagueTeams } from "@/stores/teamStore";
import { Invitation } from "@/lib/email";
import { useUser } from "@/stores/userStore";
import { useOfflineTeamStore, OfflineTeam } from "@/stores/offlineTeamStore";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useLeagueStore } from "@/stores/leagueStore";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RosterInfo } from "@/lib/utils";

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

interface OfflineTeamRoster {
  team: {
    id: string;
    name: string;
    budget: number;
    remainingBudget: number;
    draftOrder: number | null;
  };
  rosterInfo: RosterInfo;
  draftedPlayers: Array<{
    id: string;
    playerId: string;
    draftPrice: number;
    createdAt: string;
    player: {
      firstName: string;
      lastName: string;
      position: string;
      team: string | null;
      fantasyPositions: string[] | null;
      status: string | null;
      injuryStatus: string | null;
    };
  }>;
  positionCounts: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    DST: number;
    K: number;
  };
  rosterSpotsFilled: number;
  remainingRosterSpots: number;
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

  const { league_id } = useParams();
  const { userId } = useAuth();
  const { user } = useUser();
  const { createTeam, updateTeam, fetchTeams } = useLeagueTeams(settings?.id);
  const { teams: offlineTeams, loading: offlineTeamsLoading, error: offlineTeamsError, fetchTeams: fetchOfflineTeams, createTeam: createOfflineTeam, deleteTeam: deleteOfflineTeam, updateTeam: updateOfflineTeam, deleteAllTeams: deleteAllOfflineTeams } = useOfflineTeamStore();

  // Team creation state
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  // Offline team creation state
  const [showCreateOfflineTeamDialog, setShowCreateOfflineTeamDialog] = useState(false);
  const [offlineTeamName, setOfflineTeamName] = useState("");
  const [isCreatingOfflineTeam, setIsCreatingOfflineTeam] = useState(false);
  const [createOfflineTeamError, setCreateOfflineTeamError] = useState<string | null>(null);

  // Drag and drop state
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // New state for roster viewing
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState<OfflineTeam | null>(null);
  const [rosterData, setRosterData] = useState<OfflineTeamRoster | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Bulk delete state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Check if current user has a team in this league (for both live and offline mode)
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

    if (!settings?.startingBudget || settings.startingBudget <= 0) {
      setCreateOfflineTeamError("League starting budget is not set");
      return;
    }

    setIsCreatingOfflineTeam(true);
    setCreateOfflineTeamError(null);

    try {
      const success = await createOfflineTeam(settings.id, {
        name: offlineTeamName.trim(),
        budget: settings.startingBudget,
      });

      if (success) {
        setShowCreateOfflineTeamDialog(false);
        setOfflineTeamName("");
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

  const handleViewRoster = async (team: OfflineTeam) => {
    setSelectedTeamForRoster(team);
    setShowRosterDialog(true);
    setRosterLoading(true);
    setRosterError(null);

    try {
      const response = await fetch(`/api/leagues/${league_id}/offline-teams/${team.id}/roster`);
      const data = await response.json();

      if (data.success) {
        setRosterData(data.roster);
      } else {
        setRosterError(data.error || "Failed to fetch roster");
      }
    } catch (err) {
      setRosterError("Failed to fetch roster");
    } finally {
      setRosterLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!settings?.id) return;

    setIsBulkDeleting(true);
    try {
      const success = await deleteAllOfflineTeams(settings.id);
      if (success) {
        setShowBulkDeleteDialog(false);
        alert(`Successfully deleted all ${offlineTeams.length} offline teams!`);
      } else {
        alert("Failed to delete offline teams. Please try again.");
      }
    } catch (error) {
      alert("An unexpected error occurred while deleting teams.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleRandomizeDraftOrder = async () => {
    if (!settings?.id) return;

    const allTeams = [...offlineTeams, ...teams];
    if (allTeams.length < 2) return;

    // Create a shuffled array of team IDs
    const shuffledTeamIds = allTeams.map(team => team.id).sort(() => Math.random() - 0.5);
    
    try {
      // Update draft orders for all teams
      const updatePromises = shuffledTeamIds.map(async (teamId, index) => {
        const draftOrder = index + 1;
        
        // Check if it's an offline team or regular team
        const isOfflineTeam = offlineTeams.some(team => team.id === teamId);
        
        if (isOfflineTeam) {
          return updateOfflineTeam(teamId, { draftOrder });
        } else {
          // For regular teams, use the store's updateTeam method
          return updateTeam(teamId, { draftOrder });
        }
      });
      
      await Promise.all(updatePromises);
      
      // Refresh both teams lists
      await fetchOfflineTeams(settings.id);
      await fetchTeams(); // Refresh regular teams from the store
      
      alert("Draft order randomized successfully!");
    } catch (error) {
      console.error("Error randomizing draft order:", error);
      alert("Failed to randomize draft order. Please try again.");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, teamId: string) => {
    setDraggedTeamId(teamId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", teamId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetTeamId: string) => {
    e.preventDefault();
    
    if (!draggedTeamId || draggedTeamId === targetTeamId) {
      setDraggedTeamId(null);
      return;
    }

    setIsReordering(true);
    
    try {
      // Get all teams (offline + regular) and their draft orders
      const allTeams = [...offlineTeams, ...teams];
      const draggedTeam = allTeams.find(team => team.id === draggedTeamId);
      const targetTeam = allTeams.find(team => team.id === targetTeamId);
      
      if (!draggedTeam || !targetTeam) {
        setDraggedTeamId(null);
        setIsReordering(false);
        return;
      }

      // Calculate new draft orders
      const draggedIndex = allTeams.findIndex(team => team.id === draggedTeamId);
      const targetIndex = allTeams.findIndex(team => team.id === targetTeamId);
      
      // Reorder the teams array
      const reorderedTeams = [...allTeams];
      const [movedTeam] = reorderedTeams.splice(draggedIndex, 1);
      reorderedTeams.splice(targetIndex, 0, movedTeam);
      
      // Update draft orders
      const updatedTeams = reorderedTeams.map((team, index) => ({
        ...team,
        draftOrder: index + 1
      }));

      // Update all teams with new draft orders
      const updatePromises = updatedTeams.map(async (team) => {
        const isOfflineTeam = offlineTeams.some(offlineTeam => offlineTeam.id === team.id);
        
        if (isOfflineTeam) {
          return updateOfflineTeam(team.id, { draftOrder: team.draftOrder });
        } else {
          // For regular teams, use the store's updateTeam method
          return updateTeam(team.id, { draftOrder: team.draftOrder });
        }
      });
      
      await Promise.all(updatePromises);
      
      // Refresh both teams lists
      await fetchOfflineTeams(settings?.id || "");
      await fetchTeams(); // Refresh regular teams from the store
      
    } catch (error) {
      console.error("Error reordering teams:", error);
    } finally {
      setDraggedTeamId(null);
      setIsReordering(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedTeamId(null);
  };

  return (
    <>
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
          {/* Drag and Drop Instructions */}
          <div className="p-4 bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-2 border-blue-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-400 rounded flex items-center justify-center">
                <span className="text-blue-900 font-bold text-sm">ℹ</span>
              </div>
              <h3 className="text-blue-200 font-semibold">Draft Order Management</h3>
            </div>
            <p className="text-blue-100 text-sm">
              You can drag and drop teams to reorder them for the draft. The order shown below will be the draft order used during the auction.
            </p>
          </div>

          {/* All Teams Management */}
          <Card className="bg-gradient-to-br from-blue-900/90 to-gray-900/90 border-2 border-blue-800 text-blue-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-blue-300">
                    <Users className="h-5 w-5" />
                    All Teams
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {offlineTeams.length === 0 && teams.length === 0
                      ? "No teams have been created yet. Add teams for the draft."
                      : `${offlineTeams.length + teams.length} team${offlineTeams.length + teams.length === 1 ? "" : "s"} in this draft`}
                  </CardDescription>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    {offlineTeams.length < (settings.leagueSize || 10) && (
                      <Button
                        onClick={() => setShowCreateOfflineTeamDialog(true)}
                        className="bg-gradient-to-br from-blue-800/80 to-blue-600/80 border-2 border-blue-400 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team
                      </Button>
                    )}
                    {offlineTeams.length > 0 && (
                      <Button
                        onClick={() => setShowBulkDeleteDialog(true)}
                        variant="destructive"
                        className="bg-gradient-to-br from-red-800/80 to-red-600/80 border-2 border-red-400 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    )}
                    {offlineTeams.length + teams.length > 1 && (
                      <Button
                        onClick={handleRandomizeDraftOrder}
                        className="bg-gradient-to-br from-purple-800/80 to-purple-600/80 border-2 border-purple-400 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        Randomize Order
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {offlineTeamsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading teams...</span>
                </div>
              ) : offlineTeamsError ? (
                <Alert variant="destructive" className="bg-red-900/80 border-red-700 text-red-100">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{offlineTeamsError}</AlertDescription>
                </Alert>
              ) : offlineTeams.length === 0 && teams.length === 0 ? (
                <div className="text-center py-8 text-blue-100/70">
                  <Users className="h-12 w-12 mx-auto mb-4 text-blue-900/60" />
                  <p className="text-lg font-medium">No teams yet</p>
                  <p>Add teams to get started with the draft</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Combine and sort all teams by draft order */}
                  {([...offlineTeams, ...teams] as (OfflineTeam | Team)[])
                    .sort((a, b) => (a.draftOrder || 999) - (b.draftOrder || 999))
                    .map((team) => {
                      const isOfflineTeam = 'leagueId' in team; // Check if it's an offline team
                      
                      return (
                        <div
                          key={team.id}
                          draggable={isOwner && !isReordering}
                          onDragStart={(e) => handleDragStart(e, team.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, team.id)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-4 border rounded-lg bg-gray-900/80 border-gray-700 cursor-pointer transition-all duration-200 ${
                            draggedTeamId === team.id 
                              ? "opacity-50 scale-95 border-blue-400" 
                              : "hover:border-blue-400 hover:bg-gray-800/80"
                          } ${isReordering ? "pointer-events-none" : ""}`}
                        >
                          <div className="flex items-center gap-4">
                            {isOwner && (
                              <div className="text-blue-400 hover:text-blue-300 cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-5 w-5" />
                              </div>
                            )}
                            <div className={`w-10 h-10 border-2 shadow-md hover:shadow-xl rounded-full flex items-center justify-center text-white font-bold ${
                              isOfflineTeam 
                                ? "bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-blue-400"
                                : "bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-yellow-400"
                            }`}>
                              {team.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold flex items-center gap-2 text-blue-300 leading-none">
                                {team.name}
                                {!isOfflineTeam && (team as Team).ownerId === settings.ownerId && (
                                  <Crown className="h-4 w-4 text-yellow-400" />
                                )}
                              </h3>
                              <p className="text-sm text-gray-300 tracking-wide">
                                {isOfflineTeam 
                                  ? `Budget: $${(team as OfflineTeam).budget} • Draft Order: ${(team as OfflineTeam).draftOrder || "TBD"}`
                                  : `${(team as Team).ownerFirstName && (team as Team).ownerLastName
                                      ? `${(team as Team).ownerFirstName} ${(team as Team).ownerLastName}`
                                      : (team as Team).ownerEmail || "Unknown Owner"} • Draft Order: ${(team as Team).draftOrder || "TBD"}`
                                }
                              </p>
                            </div>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-2">
                              {isOfflineTeam && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                    onClick={() => handleViewRoster(team as OfflineTeam)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                    onClick={() => deleteOfflineTeam(team.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                  <p className="text-xs text-blue-200/70">
                    This team will start with ${settings?.startingBudget || 200} budget (from league settings)
                  </p>
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
                     disabled={isCreatingOfflineTeam || !offlineTeamName.trim()}
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

          {/* Bulk Delete Confirmation Dialog */}
          <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
            <AlertDialogContent className="bg-gradient-to-br from-gray-900/90 to-red-950/90 border-2 border-red-800 text-red-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Offline Teams</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete all {offlineTeams.length} offline team{offlineTeams.length === 1 ? "" : "s"}? 
                  <br /><br />
                  This action cannot be undone. All team data, roster information, and draft history will be permanently removed.
                  <br /><br />
                  <strong>This will delete:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All offline teams ({offlineTeams.length} team{offlineTeams.length === 1 ? "" : "s"})</li>
                    <li>All drafted players for these teams</li>
                    <li>All draft history and auction data</li>
                    <li>All roster information</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isBulkDeleting}
                  className="bg-gray-800 text-gray-200 border-gray-700"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="bg-red-700 text-red-100 hover:bg-red-800"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting All Teams...
                    </>
                  ) : (
                    "Delete All Teams"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <>
          {/* Admin Team Creation Section for Live Mode */}
          {!isOfflineMode && isOwner && !userHasTeam && (
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

          {/* Admin Teams Section for Offline Mode */}
          {isOfflineMode && (
            <Card className="mb-6 bg-gradient-to-br from-yellow-900/90 to-yellow-700/90 border-2 border-yellow-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-200">
                  <Crown className="h-5 w-5" />
                  Admin Teams
                </CardTitle>
                <CardDescription className="text-yellow-100/80">
                  Teams created by league admins and members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <div className="text-center py-8 text-yellow-100/70">
                    <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-900/60" />
                    <p className="text-lg font-medium">No admin teams yet</p>
                    <p>Admin teams will appear here when created</p>
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
                            <h3 className="font-semibold flex items-center gap-2 text-yellow-300 leading-none">
                              {team.name}
                              {team.ownerId === settings.ownerId && (
                                <Crown className="h-4 w-4 text-yellow-400" />
                              )}
                            </h3>
                            <p className="text-sm text-gray-300 tracking-wide">
                              {team.ownerFirstName && team.ownerLastName
                                ? `${team.ownerFirstName} ${team.ownerLastName}`
                                : team.ownerEmail || "Unknown Owner"}
                              {team.draftOrder && ` • Draft Order: ${team.draftOrder}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Team Creation Section for Offline Mode */}
          {isOfflineMode && isOwner && !userHasTeam && (
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

      {/* Roster Dialog */}
      <Dialog open={showRosterDialog} onOpenChange={setShowRosterDialog}>
        <DialogContent className="bg-gradient-to-br from-blue-900/90 to-gray-900/90 border-2 border-blue-400 text-blue-100 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-300">
              {selectedTeamForRoster?.name} - Roster
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              View drafted players and roster status for this offline team.
            </DialogDescription>
          </DialogHeader>
          
          {rosterLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading roster...</span>
            </div>
          ) : rosterError ? (
            <Alert variant="destructive" className="bg-red-900/80 border-red-700 text-red-100">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rosterError}</AlertDescription>
            </Alert>
          ) : rosterData ? (
            <div className="space-y-6">
              {/* Team Summary */}
              <Card className="bg-gray-900/80 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-blue-300">Team Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Starting Budget</p>
                      <p className="text-lg font-semibold text-green-400">${rosterData.team.budget}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Remaining Budget</p>
                      <p className="text-lg font-semibold text-yellow-400">${rosterData.team.remainingBudget}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Players Drafted</p>
                      <p className="text-lg font-semibold text-blue-400">{rosterData.rosterSpotsFilled}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Remaining Spots</p>
                      <p className="text-lg font-semibold text-purple-400">{rosterData.remainingRosterSpots}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Position Breakdown */}
              <Card className="bg-gray-900/80 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-blue-300">Position Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Object.entries(rosterData.positionCounts).map(([position, count]) => (
                      <div key={position} className="text-center">
                        <p className="text-sm text-gray-400">{position}</p>
                        <p className="text-lg font-semibold text-blue-400">{count}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Drafted Players */}
              <Card className="bg-gray-900/80 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-blue-300">Drafted Players</CardTitle>
                </CardHeader>
                <CardContent>
                  {rosterData.draftedPlayers.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">No players drafted yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-blue-200">Player</TableHead>
                          <TableHead className="text-blue-200">Position</TableHead>
                          <TableHead className="text-blue-200">Team</TableHead>
                          <TableHead className="text-blue-200">Draft Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rosterData.draftedPlayers.map((draftedPlayer) => (
                          <TableRow key={draftedPlayer.id} className="border-gray-700">
                            <TableCell className="text-blue-100">
                              {draftedPlayer.player.firstName} {draftedPlayer.player.lastName}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-900/80 border-blue-700 text-blue-200">
                                {draftedPlayer.player.position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {draftedPlayer.player.team || "FA"}
                            </TableCell>
                            <TableCell className="text-green-400 font-semibold">
                              ${draftedPlayer.draftPrice}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
} 