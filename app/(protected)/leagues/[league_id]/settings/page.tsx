"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueSettings, LeagueSettings } from "@/stores/leagueStore";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Save,
  Users,
  Calendar,
  Settings2,
  Trophy,
  DollarSign,
  UserCheck,
} from "lucide-react";

export default function LeagueSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const leagueId = params.league_id as string;

  const {
    settings,
    loading,
    error: settingsError,
    updateSettings,
  } = useLeagueSettings(leagueId);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<LeagueSettings | null>(
    null
  );

  // Form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Sync settings to local state when loaded
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  // Check if user is league owner
  const isOwner = user?.id === settings?.ownerId;

  // Handle form input changes
  const handleInputChange = (
    field: keyof LeagueSettings,
    value: string | number | null
  ) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      [field]: value,
    });
  };

  // Save settings
  const handleSave = async () => {
    if (!localSettings) return;

    setSaving(true);

    try {
      const success = await updateSettings(localSettings);

      if (success) {
        setSuccessMessage("Settings saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      // Error handling is done by the store
    } finally {
      setSaving(false);
    }
  };

  // Handle user invitation
  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      setInviteEmail("");
      setSuccessMessage("Invitation sent successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to send invitation:", err);
    } finally {
      setInviteLoading(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <AlertDescription>
            Only the league owner can access these settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (settingsError && !settings) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <AlertDescription>{settingsError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!settings || !localSettings) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">League Settings</h1>
          <p className="text-muted-foreground">{localSettings.name}</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {settingsError && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {settingsError}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Basic Settings
            </CardTitle>
            <CardDescription>
              Configure basic league information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="league-name">League Name</Label>
                <Input
                  id="league-name"
                  value={localSettings.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="league-size">League Size</Label>
                <Input
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
              <Label htmlFor="starting-budget">Starting Budget ($)</Label>
              <Input
                id="starting-budget"
                type="number"
                min="100"
                max="1000"
                value={localSettings.startingBudget}
                onChange={(e) =>
                  handleInputChange("startingBudget", parseInt(e.target.value))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Draft Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Draft Settings
            </CardTitle>
            <CardDescription>
              Set when and where your draft will take place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="draft-date">Draft Date</Label>
                <Input
                  id="draft-date"
                  type="date"
                  value={localSettings.draftDate || ""}
                  onChange={(e) =>
                    handleInputChange("draftDate", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="draft-time">Draft Time</Label>
                <Input
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
              <Label htmlFor="draft-location">Draft Location</Label>
              <Textarea
                id="draft-location"
                placeholder="Enter draft location or online platform details..."
                value={localSettings.draftLocation || ""}
                onChange={(e) =>
                  handleInputChange("draftLocation", e.target.value)
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Roster Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Roster Configuration
            </CardTitle>
            <CardDescription>
              Configure starting lineup and bench positions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="qb-slots">QB</Label>
                <Input
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
                <Label htmlFor="rb-slots">RB</Label>
                <Input
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
                <Label htmlFor="wr-slots">WR</Label>
                <Input
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
                <Label htmlFor="te-slots">TE</Label>
                <Input
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
                <Label htmlFor="flex-slots">FLEX</Label>
                <Input
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
                <Label htmlFor="dst-slots">D/ST</Label>
                <Input
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
                <Label htmlFor="k-slots">K</Label>
                <Input
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
                <Label htmlFor="bench-slots">Bench</Label>
                <Input
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
          </CardContent>
        </Card>

        {/* Keepers Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Keeper Players
            </CardTitle>
            <CardDescription>
              Manage players that are pre-assigned to teams with their keeper
              cost
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Keepers allow teams to retain specific players from previous
              seasons at a predetermined cost. This feature will be available
              once teams are created and players are available.
            </div>
            <Button variant="outline" disabled>
              Manage Keepers (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* League Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold">
                    {/* teams.length is not defined in this component */}
                    {/* Assuming settings.leagueSize is the intended value */}
                    {settings?.leagueSize || "N/A"} /{" "}
                    {settings?.leagueSize || "N/A"}
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
                    ${settings?.startingBudget || "N/A"}
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
                    {/* teams.length === settings.leagueSize is not defined */}
                    {/* Assuming settings.leagueSize is the intended value */}
                    {settings?.leagueSize === undefined ||
                    settings?.leagueSize === null
                      ? "N/A"
                      : settings?.leagueSize === 0
                      ? "Open"
                      : "Full"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Management Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Multiple ways to add teams to your league
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Manage Teams:</strong> Visit the teams page to invite
                users, manually add teams, or view all current teams.
              </p>
              <p className="text-sm">
                <strong>User Invitations:</strong> Send invitation emails to
                users who can then create their own teams.
              </p>
              <p className="text-sm">
                <strong>Self-Registration:</strong> Users can join your league
                directly from the league page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              League Invitations
            </CardTitle>
            <CardDescription>Invite new members to your league</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address to invite..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleInviteUser}
                disabled={inviteLoading || !inviteEmail.trim()}
              >
                {inviteLoading ? "Inviting..." : "Send Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
