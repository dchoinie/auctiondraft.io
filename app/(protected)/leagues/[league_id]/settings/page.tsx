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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Users,
  Calendar,
  Settings2,
  Trophy,
  DollarSign,
  UserCheck,
  Database,
  GripVertical,
  X,
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

  // Player data state
  const [playerDataInfo, setPlayerDataInfo] = useState<{
    lastUpdated: string | null;
    playerCount: number;
    status: string;
    loading: boolean;
  }>({
    lastUpdated: null,
    playerCount: 0,
    status: "unknown",
    loading: false,
  });

  // Manual draft order state
  const [showDraftOrderModal, setShowDraftOrderModal] = useState(false);
  const [teams, setTeams] = useState<
    Array<{
      id: string;
      name: string;
      ownerId: string;
      draftOrder: number | null;
    }>
  >([]);
  const [draftOrderTeams, setDraftOrderTeams] = useState<
    Array<{
      id: string;
      name: string;
      ownerId: string;
      draftOrder: number;
    }>
  >([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Sync settings to local state when loaded
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  // Fetch player data information
  const fetchPlayerDataInfo = async () => {
    setPlayerDataInfo((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/admin/player-data-info");
      const data = await response.json();

      if (data.success) {
        setPlayerDataInfo({
          lastUpdated: data.lastUpdated,
          playerCount: data.playerCount,
          status: data.status,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching player data info:", error);
      setPlayerDataInfo((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch teams for draft order management
  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/draft/order`);
      const data = await response.json();

      if (data.success) {
        setTeams(data.data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Fetch player data info when component loads
  useEffect(() => {
    fetchPlayerDataInfo();
    fetchTeams();
  }, []);

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

  // Handle draft order randomization
  const handleRandomizeDraftOrder = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/draft/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "randomize" }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Draft order randomized successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || "Failed to randomize draft order");
      }
    } catch (err) {
      console.error("Failed to randomize draft order:", err);
      // You might want to set an error state here
    } finally {
      setSaving(false);
    }
  };

  // Handle manual draft order setting
  const handleSetManualDraftOrder = () => {
    // Sort teams by current draft order or by name if no order set
    const sortedTeams = [...teams].sort((a, b) => {
      if (a.draftOrder && b.draftOrder) {
        return a.draftOrder - b.draftOrder;
      }
      if (a.draftOrder && !b.draftOrder) return -1;
      if (!a.draftOrder && b.draftOrder) return 1;
      return a.name.localeCompare(b.name);
    });

    // Create draft order teams with sequential numbers
    const orderedTeams = sortedTeams.map((team, index) => ({
      ...team,
      draftOrder: index + 1,
    }));

    setDraftOrderTeams(orderedTeams);
    setShowDraftOrderModal(true);
  };

  // Handle moving team up in draft order
  const moveTeamUp = (index: number) => {
    if (index === 0) return;

    const newOrder = [...draftOrderTeams];
    [newOrder[index], newOrder[index - 1]] = [
      newOrder[index - 1],
      newOrder[index],
    ];

    // Update draft order numbers
    const updatedOrder = newOrder.map((team, idx) => ({
      ...team,
      draftOrder: idx + 1,
    }));

    setDraftOrderTeams(updatedOrder);
  };

  // Handle moving team down in draft order
  const moveTeamDown = (index: number) => {
    if (index === draftOrderTeams.length - 1) return;

    const newOrder = [...draftOrderTeams];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];

    // Update draft order numbers
    const updatedOrder = newOrder.map((team, idx) => ({
      ...team,
      draftOrder: idx + 1,
    }));

    setDraftOrderTeams(updatedOrder);
  };

  // Save manual draft order
  const handleSaveDraftOrder = async () => {
    setSaving(true);
    try {
      // Create draft order object with teamId -> draftOrder mapping
      const draftOrder = draftOrderTeams.reduce(
        (acc, team) => {
          acc[team.id] = team.draftOrder;
          return acc;
        },
        {} as { [teamId: string]: number }
      );

      const response = await fetch(`/api/leagues/${leagueId}/draft/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "set", draftOrder }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Draft order set successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowDraftOrderModal(false);
        // Refresh teams to show new order
        await fetchTeams();
      } else {
        throw new Error(data.error || "Failed to set draft order");
      }
    } catch (err) {
      console.error("Failed to set draft order:", err);
      // You might want to set an error state here
    } finally {
      setSaving(false);
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

        {/* Draft Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Draft Management
            </CardTitle>
            <CardDescription>
              Configure draft order and auction settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Draft Order Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Draft Order</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the order teams will nominate players
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRandomizeDraftOrder}
                    disabled={
                      localSettings.isDraftStarted === 1 ||
                      saving ||
                      teams.length === 0
                    }
                  >
                    {saving ? "Processing..." : "Randomize Order"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSetManualDraftOrder}
                    disabled={
                      localSettings.isDraftStarted === 1 || teams.length === 0
                    }
                  >
                    Set Manually
                  </Button>
                </div>
              </div>
              {localSettings.isDraftStarted === 1 && (
                <Alert>
                  <AlertDescription>
                    Draft order cannot be changed after the draft has started.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Draft Order Display */}
              {teams.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium mb-3">Current Draft Order:</h5>
                  {teamsLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">
                        Loading teams...
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {teams
                        .filter((team) => team.draftOrder !== null)
                        .sort(
                          (a, b) => (a.draftOrder || 0) - (b.draftOrder || 0)
                        )
                        .map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center gap-3 p-2 bg-muted rounded-md"
                          >
                            <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                              {team.draftOrder}
                            </div>
                            <span className="text-sm font-medium">
                              {team.name}
                            </span>
                          </div>
                        ))}
                      {teams.filter((team) => team.draftOrder === null).length >
                        0 && (
                        <div className="text-sm text-muted-foreground italic">
                          {
                            teams.filter((team) => team.draftOrder === null)
                              .length
                          }{" "}
                          team(s) without draft order
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Nomination Type */}
            <div className="space-y-4">
              <div>
                <Label>Nomination Type</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose how teams nominate players each round
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="linear"
                    name="draftType"
                    value="linear"
                    checked={(localSettings.draftType || "linear") === "linear"}
                    onChange={(e) =>
                      handleInputChange("draftType", e.target.value)
                    }
                    disabled={localSettings.isDraftStarted === 1}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="linear" className="font-normal">
                    <strong>Linear:</strong> Teams nominate in the same order
                    every round (1, 2, 3, 4...)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="snake"
                    name="draftType"
                    value="snake"
                    checked={(localSettings.draftType || "linear") === "snake"}
                    onChange={(e) =>
                      handleInputChange("draftType", e.target.value)
                    }
                    disabled={localSettings.isDraftStarted === 1}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="snake" className="font-normal">
                    <strong>Snake:</strong> Order reverses each round (1, 2, 3,
                    4... then 4, 3, 2, 1...)
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timer Settings */}
            <div className="space-y-4">
              <div>
                <Label>Auction Timer</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Configure if and how long teams have to make nominations
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="timer-enabled"
                    checked={(localSettings.timerEnabled || 0) === 1}
                    onChange={(e) =>
                      handleInputChange(
                        "timerEnabled",
                        e.target.checked ? 1 : 0
                      )
                    }
                    disabled={localSettings.isDraftStarted === 1}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="timer-enabled" className="font-normal">
                    Enable nomination timer
                  </Label>
                </div>

                {(localSettings.timerEnabled || 0) === 1 && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="timer-duration">
                      Timer Duration (seconds)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
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
                        disabled={localSettings.isDraftStarted === 1}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        ({Math.floor((localSettings.timerDuration || 60) / 60)}:
                        {String(
                          (localSettings.timerDuration || 60) % 60
                        ).padStart(2, "0")}{" "}
                        minutes)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Teams will have this amount of time to nominate a player.
                      If time expires, the turn automatically advances to the
                      next team.
                    </p>
                  </div>
                )}
              </div>
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
                users or view all current teams.
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

        {/* Player Data Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Player Data
            </CardTitle>
            <CardDescription>
              NFL player database information and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {playerDataInfo.loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">
                  Loading player data info...
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Players:</span>
                  <span className="text-sm">
                    {playerDataInfo.playerCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Updated:</span>
                  <span className="text-sm">
                    {playerDataInfo.lastUpdated
                      ? new Date(
                          playerDataInfo.lastUpdated
                        ).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span
                    className={`text-sm capitalize ${
                      playerDataInfo.status === "success"
                        ? "text-green-600"
                        : playerDataInfo.status === "failed"
                          ? "text-red-600"
                          : "text-yellow-600"
                    }`}
                  >
                    {playerDataInfo.status}
                  </span>
                </div>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Player data is managed by platform administrators and sourced
                from the Sleeper API. Data is refreshed at most once per day to
                ensure accuracy.
              </p>
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

      {/* Manual Draft Order Modal */}
      <Dialog open={showDraftOrderModal} onOpenChange={setShowDraftOrderModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Draft Order</DialogTitle>
            <DialogDescription>
              Arrange teams in the order they will nominate players. Team #1
              will nominate first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {draftOrderTeams.map((team, index) => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTeamUp(index)}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTeamDown(index)}
                    disabled={index === draftOrderTeams.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    ↓
                  </Button>
                </div>

                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                    {team.draftOrder}
                  </div>
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pick #{team.draftOrder}
                    </p>
                  </div>
                </div>

                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDraftOrderModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraftOrder}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
