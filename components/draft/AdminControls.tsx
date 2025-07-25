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

// admin tools
// start draft
// pause draft
// manually assign player
// undo last pick
// manually assign nomination

interface AdminControlsProps {
  draftState: DraftRoomState | null;
  handleStartDraft: () => void;
  handlePauseDraft: () => void;
}

export default function AdminControls({
  draftState,
  handleStartDraft,
  handlePauseDraft,
}: AdminControlsProps) {
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const { draftStarted } = draftState || {};
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
          <div className="grid grid-cols-4 gap-4 tracking-widest">
            <Button
              onClick={() =>
                draftStarted ? handlePauseDraft() : handleStartDraft()
              }
              className="flex items-center gap-2 bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl font-semibold text-emerald-100"
            >
              {draftStarted ? <Pause size={18} /> : <Play size={18} />}
              {draftStarted ? "Pause Draft" : "Start Draft"}
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-2 border-blue-400 shadow-md hover:shadow-xl font-semibold text-blue-100">
              <Undo2 size={18} />
              Undo Last Pick
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md hover:shadow-xl font-semibold text-gray-100">
              <UserPlus size={18} />
              Manually Assign Player
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl font-semibold text-yellow-100">
              <UserCircle2 size={18} />
              Set Nominator
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
