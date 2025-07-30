import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Shield, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React, { useState } from "react";
import { LeagueSettings } from "@/stores/leagueStore";
import { useUser } from "@/stores/userStore";
import { useParams, useRouter } from "next/navigation";
import { useLeagueStore } from "@/stores/leagueStore";

interface SettingsTabProps {
  localSettings: LeagueSettings | null;
  successMessage: string | null;
  error: string | null;
  handleInputChange: (field: string, value: string | number) => void;
  handleUpdateSettings: () => void;
  isDirty: boolean;
  saving: boolean;
}

export function SettingsTab({
  localSettings,
  successMessage,
  error,
  handleInputChange,
  handleUpdateSettings,
  isDirty,
  saving,
}: SettingsTabProps) {
  const { user } = useUser();
  const { league_id } = useParams();
  const router = useRouter();
  const { leagues, removeLeague } = useLeagueStore();
  const league = leagues.find((league) => league.id === league_id);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Check if user is league admin
  const isAdmin = user?.id === league?.ownerId;

  const handleDeleteLeague = async () => {
    if (!league_id || Array.isArray(league_id)) return;
    
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/leagues/${league_id}/delete`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from store and redirect to dashboard
        removeLeague(league_id);
        router.push("/dashboard");
      } else {
        setDeleteError(data.error || "Failed to delete league");
      }
    } catch (err) {
      setDeleteError("An error occurred while deleting the league");
    } finally {
      setDeleting(false);
    }
  };

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
            Only league administrators can access league settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
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
              <Label className="text-emerald-300" htmlFor="league-name">
                League Name
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                id="league-name"
                value={localSettings.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-emerald-300" htmlFor="league-size">
                League Size
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
            <Label className="text-emerald-300" htmlFor="starting-budget">
              Starting Budget ($)
            </Label>
            <Input
              className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
          {/* Draft Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-emerald-300" htmlFor="draft-date">
                Draft Date
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                id="draft-date"
                type="date"
                value={localSettings.draftDate || ""}
                onChange={(e) => handleInputChange("draftDate", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-emerald-300" htmlFor="draft-time">
                Draft Time
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                id="draft-time"
                type="time"
                value={localSettings.draftTime || ""}
                onChange={(e) => handleInputChange("draftTime", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-emerald-300" htmlFor="draft-location">
              Draft Location
            </Label>
            <Textarea
              className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
              id="draft-location"
              placeholder="Enter draft location"
              value={localSettings.draftLocation || ""}
              onChange={(e) =>
                handleInputChange("draftLocation", e.target.value)
              }
              rows={3}
            />
          </div>
          {/* Nomination Type */}
          <div className="space-y-3">
            <Label className="text-emerald-300">Nomination Type</Label>
            <div className="flex items-center space-x-4">
              <label className="text-gray-50 flex items-center space-x-2">
                <input
                  className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                  type="radio"
                  id="linear"
                  name="draftType"
                  value="linear"
                  checked={(localSettings.draftType || "linear") === "linear"}
                  onChange={(e) =>
                    handleInputChange("draftType", e.target.value)
                  }
                />
                <span>Linear</span>
              </label>
              <label className="text-gray-50 flex items-center space-x-2">
                <input
                  className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                  type="radio"
                  id="snake"
                  name="draftType"
                  value="snake"
                  checked={(localSettings.draftType || "linear") === "snake"}
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
            <Label className="text-emerald-300">Auction Timer</Label>
            <div className="flex items-center space-x-2">
              <input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
                type="checkbox"
                id="timer-enabled"
                checked={(localSettings.timerEnabled || 0) === 1}
                onChange={(e) =>
                  handleInputChange("timerEnabled", e.target.checked ? 1 : 0)
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
                <Label className="text-emerald-300" htmlFor="timer-duration">
                  Timer Duration (seconds)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 w-24"
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
                    {String((localSettings.timerDuration || 60) % 60).padStart(
                      2,
                      "0"
                    )}{" "}
                    minutes)
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* Roster Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-emerald-300" htmlFor="qb-slots">
                QB
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="rb-slots">
                RB
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="wr-slots">
                WR
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="te-slots">
                TE
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="flex-slots">
                FLEX
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="dst-slots">
                D/ST
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="k-slots">
                K
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
              <Label className="text-emerald-300" htmlFor="bench-slots">
                Bench
              </Label>
              <Input
                className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
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
            <p className="text-sm text-gray-300">
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
              className="flex items-center gap-2 bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl"
            >
              <Save className="h-4 w-4" />
              {saving ? "Updating..." : "Update Settings"}
            </Button>
          </div>

          {/* Delete League Section */}
          <div className="border-t border-gray-700 pt-8 mt-8">
            <div className="text-center flex flex-col items-center">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Danger Zone
              </h3>
              <p className="text-gray-400 mb-4">
                This action cannot be undone. All league data will be permanently deleted.
              </p>
              
              {deleteError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {deleteError}
                  </AlertDescription>
                </Alert>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex items-center gap-2 bg-gradient-to-br from-red-900/80 to-red-700/80 border-2 border-red-400 shadow-md hover:shadow-xl"
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? "Deleting..." : "Delete League"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the league
                      and all associated data. This action cannot be reversed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteLeague}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete League
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          No league settings found.
        </div>
      )}
    </>
  );
}
