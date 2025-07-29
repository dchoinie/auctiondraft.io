import { DraftRoomState } from "@/party";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import {
  Play,
  Pause,
  Undo2,
  UserPlus,
  UserCircle2,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";

interface AdminControlsProps {
  draftState: DraftRoomState | null;
  handleStartDraft: () => void;
  handlePauseDraft: () => void;
  handleResumeDraft: () => void;
  handleResetDraft: () => void;
}

export default function AdminControls({
  draftState,
  handleStartDraft,
  handlePauseDraft,
  handleResumeDraft,
  handleResetDraft,
}: AdminControlsProps) {
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const { draftPhase } = draftState || {};
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  return (
    <Card
      className={cn(
        "backdrop-blur-md bg-emerald-900/60 border-emerald-400 shadow-xl p-3 sm:p-4 lg:p-6 rounded-xl w-full mx-auto relative border",
        !controlsVisible && "bg-transparent border-none shadow-none"
      )}
    >
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="text-gray-50">
            <Button
              variant="ghost"
              size="icon"
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 w-8 sm:h-10 sm:w-10"
            >
              <Settings size={18} className="sm:w-[22px] sm:h-[22px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setControlsVisible((v) => !v)}
              className="hover:cursor-pointer"
            >
              {controlsVisible ? "Hide controls" : "Show admin controls"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {controlsVisible && (
        <>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-300 mb-1">
            Admin Controls
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mb-3 sm:mb-4">
            Manage the draft session and make manual adjustments as needed.
          </p>
          <Separator className="mb-3 sm:mb-4 bg-emerald-700/60" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 tracking-wide">
            <Button
              onClick={() => {
                if (draftPhase === "pre") {
                  handleStartDraft();
                } else if (draftPhase === "paused") {
                  handleResumeDraft();
                } else {
                  handlePauseDraft();
                }
              }}
              className="flex items-center gap-1 sm:gap-2 bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl font-semibold text-emerald-100 whitespace-normal text-xs sm:text-sm p-2 sm:p-3"
            >
              {draftPhase === "pre" ? (
                <>
                  <Play size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">Start Draft</span>
                  <span className="sm:hidden">Start</span>
                </>
              ) : draftPhase === "paused" ? (
                <>
                  <Play size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">Resume Draft</span>
                  <span className="sm:hidden">Resume</span>
                </>
              ) : (
                <>
                  <Pause size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">Pause Draft</span>
                  <span className="sm:hidden">Pause</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowResetDialog(true)}
              className="flex items-center gap-1 sm:gap-2 bg-gradient-to-br from-red-900/80 to-red-700/80 border-2 border-red-400 shadow-md hover:shadow-xl font-semibold text-red-100 whitespace-normal text-xs sm:text-sm p-2 sm:p-3"
            >
              <Undo2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Reset Draft</span>
              <span className="sm:hidden">Reset</span>
            </Button>

            <Button className="flex items-center gap-1 sm:gap-2 bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-2 border-blue-400 shadow-md hover:shadow-xl font-semibold text-blue-100 whitespace-normal text-xs sm:text-sm p-2 sm:p-3">
              <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Add Player</span>
              <span className="sm:hidden">Add</span>
            </Button>

            <Button className="flex items-center gap-1 sm:gap-2 bg-gradient-to-br from-purple-900/80 to-purple-700/80 border-2 border-purple-400 shadow-md hover:shadow-xl font-semibold text-purple-100 whitespace-normal text-xs sm:text-sm p-2 sm:p-3">
              <UserCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Manage Teams</span>
              <span className="sm:hidden">Teams</span>
            </Button>

            <Button className="flex items-center gap-1 sm:gap-2 bg-gradient-to-br from-orange-900/80 to-orange-700/80 border-2 border-orange-400 shadow-md hover:shadow-xl font-semibold text-orange-100 whitespace-normal text-xs sm:text-sm p-2 sm:p-3">
              <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </Button>
          </div>
        </>
      )}

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-gray-900/95 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Reset Draft</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to reset the draft? This will clear all
              drafted players and reset the draft state. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              className="w-full sm:w-auto bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleResetDraft();
                setShowResetDialog(false);
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              Reset Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
