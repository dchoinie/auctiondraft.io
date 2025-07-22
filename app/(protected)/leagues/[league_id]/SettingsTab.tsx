import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import React from "react";

export function SettingsTab(props: any) {
  return (
    <>
      {props.localSettings ? (
        <div className="space-y-6">
          {props.successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {props.successMessage}
              </AlertDescription>
            </Alert>
          )}
          {props.error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {props.error}
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
                value={props.localSettings.name}
                onChange={(e) =>
                  props.handleInputChange("name", e.target.value)
                }
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
                value={props.localSettings.leagueSize}
                onChange={(e) =>
                  props.handleInputChange(
                    "leagueSize",
                    parseInt(e.target.value)
                  )
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
              value={props.localSettings.startingBudget}
              onChange={(e) =>
                props.handleInputChange(
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
                value={props.localSettings.draftDate || ""}
                onChange={(e) =>
                  props.handleInputChange("draftDate", e.target.value)
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
                value={props.localSettings.draftTime || ""}
                onChange={(e) =>
                  props.handleInputChange("draftTime", e.target.value)
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
              value={props.localSettings.draftLocation || ""}
              onChange={(e) =>
                props.handleInputChange("draftLocation", e.target.value)
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
                    (props.localSettings.draftType || "linear") === "linear"
                  }
                  onChange={(e) =>
                    props.handleInputChange("draftType", e.target.value)
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
                    (props.localSettings.draftType || "linear") === "snake"
                  }
                  onChange={(e) =>
                    props.handleInputChange("draftType", e.target.value)
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
                checked={(props.localSettings.timerEnabled || 0) === 1}
                onChange={(e) =>
                  props.handleInputChange(
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
            {(props.localSettings.timerEnabled || 0) === 1 && (
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
                    value={props.localSettings.timerDuration || 60}
                    onChange={(e) =>
                      props.handleInputChange(
                        "timerDuration",
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    (
                    {Math.floor((props.localSettings.timerDuration || 60) / 60)}
                    :
                    {String(
                      (props.localSettings.timerDuration || 60) % 60
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
                value={props.localSettings.qbSlots}
                onChange={(e) =>
                  props.handleInputChange("qbSlots", parseInt(e.target.value))
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
                value={props.localSettings.rbSlots}
                onChange={(e) =>
                  props.handleInputChange("rbSlots", parseInt(e.target.value))
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
                value={props.localSettings.wrSlots}
                onChange={(e) =>
                  props.handleInputChange("wrSlots", parseInt(e.target.value))
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
                value={props.localSettings.teSlots}
                onChange={(e) =>
                  props.handleInputChange("teSlots", parseInt(e.target.value))
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
                value={props.localSettings.flexSlots}
                onChange={(e) =>
                  props.handleInputChange("flexSlots", parseInt(e.target.value))
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
                value={props.localSettings.dstSlots}
                onChange={(e) =>
                  props.handleInputChange("dstSlots", parseInt(e.target.value))
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
                value={props.localSettings.kSlots}
                onChange={(e) =>
                  props.handleInputChange("kSlots", parseInt(e.target.value))
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
                value={props.localSettings.benchSlots}
                onChange={(e) =>
                  props.handleInputChange(
                    "benchSlots",
                    parseInt(e.target.value)
                  )
                }
              />
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Total Roster Size:{" "}
              {props.localSettings.qbSlots +
                props.localSettings.rbSlots +
                props.localSettings.wrSlots +
                props.localSettings.teSlots +
                props.localSettings.flexSlots +
                props.localSettings.dstSlots +
                props.localSettings.kSlots +
                props.localSettings.benchSlots}{" "}
              players
            </p>
          </div>
          {/* Update Button */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={props.handleUpdateSettings}
              disabled={!props.isDirty || props.saving}
              size="lg"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {props.saving ? "Updating..." : "Update Settings"}
            </Button>
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
