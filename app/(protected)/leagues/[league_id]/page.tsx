/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { League, useLeagueStore } from "@/stores/leagueStore";
import { useParams } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueTeams } from "@/stores/teamStore";
import { useLeagueKeepers } from "@/stores/keepersStore";
import { useLeagueSettings } from "@/stores/leagueStore";
import { KeepersTab } from "./KeepersTab";
import { DraftTab } from "./DraftTab";
import { TeamsTab } from "./TeamsTab";
import { RostersTab } from "./RostersTab";
import { SettingsTab } from "./SettingsTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Tab {
  value: string;
  label: string;
  adminOnly?: boolean;
}

const allTabs: Tab[] = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "teams",
    label: "Teams",
  },
  {
    value: "rosters",
    label: "Rosters",
  },
  {
    value: "analytics",
    label: "Analytics",
  },
  {
    value: "settings",
    label: "Settings",
    adminOnly: true,
  },
  {
    value: "keepers",
    label: "Keepers",
    adminOnly: true,
  },
];

export default function LeaguePage() {
  const { league_id } = useParams();
  const { leagues, fetchLeagues, loading: leaguesLoading } = useLeagueStore();
  const league = leagues.find((league: League) => league.id === league_id);
  const { user, loading: userLoading } = useUser();

  // Get loading states for all data dependencies
  const { loading: settingsLoading } = useLeagueSettings(league_id as string);
  const { loading: teamsLoading } = useLeagueTeams(league_id as string);
  const { loading: keepersLoading } = useLeagueKeepers(league_id as string);

  const [localSettings, setLocalSettings] = useState(league?.settings || null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("draft");

  // Check if user is league admin
  const isAdmin = user?.id === league?.ownerId;

  // Filter tabs based on admin status
  const tabs = useMemo(() => {
    return allTabs.filter((tab) => !tab.adminOnly || isAdmin);
  }, [isAdmin]);

  // Determine if we're still loading all necessary data
  const isLoading = useMemo(() => {
    return (
      userLoading ||
      leaguesLoading ||
      settingsLoading ||
      teamsLoading ||
      keepersLoading ||
      !league ||
      !user
    );
  }, [
    userLoading,
    leaguesLoading,
    settingsLoading,
    teamsLoading,
    keepersLoading,
    league,
    user,
  ]);

  // Update active tab if current tab is not available for user
  useEffect(() => {
    if (!tabs.find((tab) => tab.value === activeTab)) {
      setActiveTab("draft");
    }
  }, [tabs, activeTab]);

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
  }, [leagues.length, fetchLeagues]);

  // Use league_id from params and league from store
  const leagueId = league_id as string;
  // Use league as settings
  const settings = league?.settings;
  const isOwner = user?.id === settings?.ownerId;
  // Teams state/logic
  const {
    teams = [],
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
  // State for cancelling invitations
  const [cancellingInvitation, setCancellingInvitation] = useState<
    string | null
  >(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<any | null>(
    null
  );

  // Fetch pending invitations
  const fetchPendingInvitations = async () => {
    if (!isAdmin) return; // Only fetch if user is admin
    
    try {
      const response = await fetch(`/api/leagues/${leagueId}/invite`);
      const data = await response.json();
      if (data.success) {
        // Filter out invitations for users who already have teams
        const filteredInvitations = data.invitations.filter((invitation: any) => {
          return !teams.some(team => team.ownerEmail === invitation.email);
        });
        setPendingInvitations(filteredInvitations);
      }
    } catch (error) {
      console.error("Failed to fetch pending invitations:", error);
    }
  };

  // Fetch invitations when page loads or when teams change
  useEffect(() => {
    if (isAdmin && !teamsLoading) {
      fetchPendingInvitations();
    }
  }, [isAdmin, teamsLoading, teams]);

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
        // Refresh invitations list
        fetchPendingInvitations();
        toast.success(
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
        toast.success(`Invitation to ${invitationToCancel.email} has been cancelled.`);
      } else {
        toast.error(`Failed to cancel invitation: ${data.error}`);
      }
    } catch (error) {
      toast.error("Failed to cancel invitation. Please try again.");
    } finally {
      setCancellingInvitation(null);
    }
  };
  const startCancelInvitation = (invitation: any) => {
    setInvitationToCancel(invitation);
    setShowCancelDialog(true);
  };

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

  // Show loading spinner until all data is loaded
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-4" />
          <div className="text-lg text-gray-300">Loading league data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-50 text-center mb-6">
        {league?.name}
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Center the TabsList */}
        <div className="flex justify-center">
          <TabsList>
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
          <DraftTab setActiveTab={setActiveTab} />
        </TabsContent>
        <TabsContent value="teams" className="mt-6">
          <TeamsTab
            userLoading={userLoading}
            teamsLoading={teamsLoading}
            settings={settings}
            isOwner={isOwner}
            pendingInvitations={pendingInvitations}
            startCancelInvitation={startCancelInvitation}
            cancellingInvitation={cancellingInvitation}
            teams={teams}
            setShowInviteDialog={setShowInviteDialog}
            showInviteDialog={showInviteDialog}
            inviteError={inviteError}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            isSendingInvite={isSendingInvite}
            handleSendInvitation={handleSendInvitation}
            setDeletingTeam={setDeletingTeam}
            deletingTeam={deletingTeam}
            isDeleting={isDeleting}
            handleDeleteTeam={handleDeleteTeam}
            showCancelDialog={showCancelDialog}
            setShowCancelDialog={setShowCancelDialog}
            invitationToCancel={invitationToCancel}
            handleCancelInvitation={handleCancelInvitation}
          />
        </TabsContent>
        <TabsContent value="rosters" className="mt-6">
          <RostersTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="settings" className="mt-6">
            <SettingsTab
              localSettings={localSettings}
              successMessage={successMessage}
              error={error}
              handleInputChange={handleInputChange}
              handleUpdateSettings={handleUpdateSettings}
              isDirty={isDirty}
              saving={saving}
            />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="keepers" className="mt-6">
            <KeepersTab leagueId={league_id as string} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
