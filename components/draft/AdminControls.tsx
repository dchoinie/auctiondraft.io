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
        "backdrop-blur-md bg-emerald-900/60 border-emerald-400 shadow-xl p-6 rounded-xl w-full mx-auto relative",
        !controlsVisible && "bg-transparent border-none shadow-none"
      )}
    >
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="text-gray-50">
            <Button
              variant="ghost"
              size="icon"
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <Settings size={22} />
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
          <h2 className="text-2xl font-bold text-emerald-300 mb-1">
            Admin Controls
          </h2>
          <p className="text-emerald-100 text-sm mb-4">
            Manage the draft session and make manual adjustments as needed.
          </p>
          <Separator className="mb-4 bg-emerald-700/60" />
          <div className="grid grid-cols-5 gap-3 tracking-wide">
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
              className="flex items-center gap-2 bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl font-semibold text-emerald-100 whitespace-normal"
            >
              {draftPhase === "pre" ? (
                <>
                  <Play size={18} />
                  Start Draft
                </>
              ) : draftPhase === "paused" ? (
                <>
                  <Play size={18} />
                  Resume Draft
                </>
              ) : (
                <>
                  <Pause size={18} />
                  Pause Draft
                </>
              )}
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-2 border-blue-400 shadow-md hover:shadow-xl font-semibold text-blue-100 whitespace-normal">
              <Undo2 size={18} />
              Undo Last Pick
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl font-semibold text-gray-100 whitespace-normal">
              <UserPlus size={18} />
              Manually Assign Player
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl font-semibold text-yellow-100 whitespace-normal">
              <UserCircle2 size={18} />
              Set Nominator
            </Button>
            <Button
              onClick={() => setShowResetDialog(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-red-900/80 to-red-700/80 border-2 border-red-400 shadow-md hover:shadow-xl font-semibold text-red-100 whitespace-normal"
            >
              Reset Draft
            </Button>
          </div>
        </>
      )}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Draft?</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the draft? <br />
              <span className="text-red-600 font-semibold">
                This cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowResetDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowResetDialog(false);
                handleResetDraft();
              }}
            >
              Yes, Reset Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
