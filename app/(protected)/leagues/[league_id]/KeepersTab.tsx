import { useState, useEffect } from "react";
import { useLeagueTeams } from "@/stores/teamStore";
import { useLeagueKeepers, Keeper } from "@/stores/keepersStore";
import { usePlayers, Player } from "@/stores/playersStore";
import { useOfflineTeamStore, OfflineTeam } from "@/stores/offlineTeamStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Shield, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/stores/userStore";
import { useParams } from "next/navigation";
import { useLeagueStore } from "@/stores/leagueStore";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KeepersTabProps {
  leagueId: string;
}

export function KeepersTab({ leagueId }: KeepersTabProps) {
  const { user } = useUser();
  const { league_id } = useParams();
  const { leagues } = useLeagueStore();
  const league = leagues.find((league) => league.id === league_id);

  // Check if user is league admin
  const isAdmin = user?.id === league?.ownerId;

  // Check if league is in offline mode
  const isOfflineMode = league?.settings?.draftMode === "offline";

  // All hooks must be called before any conditional returns
  const { teams, loading: teamsLoading } = useLeagueTeams(leagueId);
  const {
    keepers: existingKeepers,
    loading: keepersLoading,
    createKeeper,
    deleteKeeper,
  } = useLeagueKeepers(leagueId);
  const {
    players,
    loading: playersLoading,
    fetchPlayersPage,
    error: playersError,
  } = usePlayers(1, 1000);
  const { 
    teams: offlineTeams, 
    loading: offlineTeamsLoading, 
    fetchTeams: fetchOfflineTeams 
  } = useOfflineTeamStore();
  
  const [keeperSelections, setKeeperSelections] = useState<{
    [teamId: string]: Array<{ playerId: string; amount: string }>;
  }>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Fetch all players on mount if not already loaded
  useEffect(() => {
    if (players.length === 0 && !playersLoading) {
      console.log("KeepersTab: Fetching players...");
      fetchPlayersPage();
    }
  }, [players, playersLoading, fetchPlayersPage]);

  // Fetch offline teams when in offline mode
  useEffect(() => {
    if (isOfflineMode && leagueId) {
      fetchOfflineTeams(leagueId);
    }
  }, [isOfflineMode, leagueId, fetchOfflineTeams]);

  // Debug effect to log player data
  useEffect(() => {
    console.log("KeepersTab Debug:", {
      playersCount: players.length,
      playersLoading,
      playersError,
      firstFewPlayers: players.slice(0, 3).map(p => `${p.firstName} ${p.lastName} (${p.position})`)
    });
    setDebugInfo(`Players loaded: ${players.length}, Loading: ${playersLoading}, Error: ${playersError || 'none'}`);
  }, [players, playersLoading, playersError]);

  // Show loading state while data is being fetched
  if (teamsLoading || keepersLoading || playersLoading || (isOfflineMode && offlineTeamsLoading)) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading keepers data...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-400 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-400">
            Only league administrators can manage keepers.
          </p>
        </div>
      </div>
    );
  }

  // Combine regular teams and offline teams
  const allTeams = [
    ...teams.map(team => ({ ...team, isOffline: false })),
    ...offlineTeams.map(team => ({ ...team, isOffline: true }))
  ];

  const handleSelectChange = (
    teamId: string,
    idx: number,
    playerId: string
  ) => {
    setKeeperSelections((prev) => {
      const arr = prev[teamId] ? [...prev[teamId]] : [];
      arr[idx] = { ...arr[idx], playerId };
      return { ...prev, [teamId]: arr };
    });
  };

  const handleAmountChange = (teamId: string, idx: number, amount: string) => {
    setKeeperSelections((prev) => {
      const arr = prev[teamId] ? [...prev[teamId]] : [];
      arr[idx] = { ...arr[idx], amount };
      return { ...prev, [teamId]: arr };
    });
  };

  const handleAddKeeper = (teamId: string) => {
    setKeeperSelections((prev) => {
      const arr = prev[teamId] ? [...prev[teamId]] : [];
      arr.push({ playerId: "", amount: "" });
      return { ...prev, [teamId]: arr };
    });
  };

  // Remove a keeper selection row
  const handleRemoveKeeper = (teamId: string, idx: number) => {
    setKeeperSelections((prev) => {
      const arr = prev[teamId] ? [...prev[teamId]] : [];
      arr.splice(idx, 1);
      return { ...prev, [teamId]: arr };
    });
  };

  // Delete an existing keeper (API call)
  const handleDeleteExistingKeeper = async (keeperId: string) => {
    try {
      const success = await deleteKeeper(keeperId);
      if (!success) {
        toast.error("Failed to delete keeper");
      } else {
        toast.success("Keeper deleted successfully!");
      }
    } catch {
      toast.error("Failed to delete keeper");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    
    try {
      // Collect all keeper operations
      const keeperOperations: Array<{
        team: any;
        selection: { playerId: string; amount: string };
        operation: Promise<boolean>;
      }> = [];

      // Build all keeper operations
      allTeams.forEach((team) => {
        const selections = keeperSelections[team.id] || [];
        selections
          .filter((sel) => sel.playerId && sel.amount)
          .forEach((selection) => {
            console.log(`Adding keeper operation for team ${team.name}:`, {
              team_id: team.id,
              league_id: leagueId,
              player_id: selection.playerId,
              amount: Number(selection.amount),
            });
            
            const operation = createKeeper({
              team_id: team.id,
              league_id: leagueId,
              player_id: selection.playerId,
              amount: Number(selection.amount),
            });
            
            keeperOperations.push({
              team,
              selection,
              operation,
            });
          });
      });

      console.log(`Total keeper operations to execute: ${keeperOperations.length}`);

      if (keeperOperations.length === 0) {
        setError("No keepers to save");
        toast.error("No keepers to save");
        return;
      }

      // Execute all operations and track results
      console.log("Starting to execute keeper operations...");
      const results = await Promise.allSettled(
        keeperOperations.map((op) => op.operation)
      );
      console.log("Keeper operations completed. Results:", results);

      // Analyze results
      const successful = results.filter((result) => result.status === "fulfilled" && result.value).length;
      const failed = results.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value)).length;

      console.log(`Analysis: ${successful} successful, ${failed} failed`);

      if (failed === 0) {
        // All keepers saved successfully
        setSuccess(`All ${successful} keepers saved successfully!`);
        toast.success(`All ${successful} keepers saved successfully!`);
        setKeeperSelections({});
      } else if (successful > 0) {
        // Some keepers saved, some failed
        const errorMessage = `${successful} keepers saved, ${failed} failed to save`;
        setSuccess(errorMessage);
        toast.success(errorMessage);
        setKeeperSelections({});
      } else {
        // All keepers failed
        const errorMessage = "Failed to save any keepers (" + failed + " attempts)";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save keepers";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (teamsLoading || keepersLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (playersLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-1/2" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Debug Information */}
      {debugInfo && (
        <Alert className="bg-blue-900/80 border-blue-700 text-blue-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Debug: {debugInfo}
          </AlertDescription>
        </Alert>
      )}

      {/* No Players Warning */}
      {players.length === 0 && !playersLoading && (
        <Alert className="bg-yellow-900/80 border-yellow-700 text-yellow-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No NFL players found in the database. This may indicate that the player database hasn&apos;t been seeded yet. 
            Please contact an administrator to seed the NFL players data.
          </AlertDescription>
        </Alert>
      )}

      {allTeams.map((team) => {
        const teamKeepers = existingKeepers.filter(
          (k: Keeper) => k.teamId === team.id
        );
        const selections =
          keeperSelections[team.id] && keeperSelections[team.id].length > 0
            ? keeperSelections[team.id]
            : [{ playerId: "", amount: "" }];
        return (
          <div key={team.id} className="border-b pb-6 mb-6">
            <div className="font-semibold text-emerald-300 flex items-center gap-2">
              {team.name}
              {team.isOffline ? (
                <span className="text-xs bg-blue-900/80 text-blue-200 px-2 py-1 rounded">
                  Offline Team
                </span>
              ) : (
                !team.isOffline && 'ownerFirstName' in team && 'ownerLastName' in team && team.ownerFirstName && team.ownerLastName
                  ? ` - ${team.ownerFirstName} ${team.ownerLastName}`
                  : ""
              )}
            </div>
            {teamKeepers.length > 0 && (
              <div className="mb-2">
                <div className="text-sm font-medium text-gray-300">
                  Existing Keepers:
                </div>
                <ul className="ml-4 list-disc">
                  {playersLoading
                    ? [...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-4 w-1/3 mb-2" />
                      ))
                    : teamKeepers.map((k: Keeper) => {
                        const player = players.find(
                          (p: Player) => p.id === k.playerId
                        );
                        return (
                          <li
                            key={k.id}
                            className="text-sm flex items-center gap-2 text-yellow-600"
                          >
                            {player
                              ? `${player.firstName} ${player.lastName} (${player.position})`
                              : k.playerId}{" "}
                            for ${k.keeperPrice}
                            <button
                              className="ml-2 text-red-500 hover:text-red-700"
                              title="Remove keeper"
                              onClick={() => handleDeleteExistingKeeper(k.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        );
                      })}
                </ul>
              </div>
            )}
            {selections.map((sel, idx) => (
              <div key={idx} className="flex items-center gap-4 mb-2">
                <Label
                  className="text-gray-400 hidden"
                  htmlFor={`player-select-${team.id}-${idx}`}
                >
                  Keeper
                </Label>
                {playersLoading ? (
                  <Skeleton className="h-8 w-48" />
                ) : (
                  <select
                    id={`player-select-${team.id}-${idx}`}
                    className="border rounded px-2 py-1 bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                    value={sel.playerId}
                    onChange={(e) =>
                      handleSelectChange(team.id, idx, e.target.value)
                    }
                  >
                    <option value="">Select player</option>
                    {players
                      .filter((p) => {
                        if (
                          selections.some(
                            (s, i) => i !== idx && s.playerId === p.id
                          )
                        )
                          return false;
                        if (existingKeepers.some((k) => k.playerId === p.id))
                          return false;
                        return true;
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName} (
                          {player.position})
                        </option>
                      ))}
                  </select>
                )}
                <Label
                  className="text-gray-400 hidden"
                  htmlFor={`amount-input-${team.id}-${idx}`}
                >
                  $
                </Label>
                <Input
                  id={`amount-input-${team.id}-${idx}`}
                  type="number"
                  min={1}
                  className="w-24 bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                  value={sel.amount ?? ""}
                  onChange={(e) =>
                    handleAmountChange(team.id, idx, e.target.value)
                  }
                />
                {selections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-1 text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveKeeper(team.id, idx)}
                    title="Remove this row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                {idx === selections.length - 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
                    onClick={() => handleAddKeeper(team.id)}
                  >
                    + Add Keeper
                  </Button>
                )}
              </div>
            ))}
          </div>
        );
      })}
      <div className="pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Keepers"}
        </Button>
        {success && <div className="text-green-600 mt-2">{success}</div>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
    </div>
  );
}
