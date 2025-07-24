import { DraftRoomState } from "@/party";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  ownerId: string; // add ownerId for online check
  ownerFirstName: string | null;
  ownerLastName: string | null;
}

interface TeamTrackerProps {
  draftState: DraftRoomState | null;
  teams: Team[];
  onlineUserIds: string[];
}

export default function TeamTracker({
  draftState,
  teams,
  onlineUserIds,
}: TeamTrackerProps) {
  if (!draftState) return null;

  return (
    <div className="flex flex-col gap-4">
      {teams.map((team) => {
        const teamState = draftState.teams[team.id];
        const isTurn = draftState.currentNominatorTeamId === team.id;
        const isOnline = onlineUserIds.includes(team.ownerId);
        return (
          <Card
            key={team.id}
            className={cn(
              "transition-shadow border-2",
              isTurn
                ? "border-yellow-400 shadow-yellow-300/40 shadow-lg bg-yellow-100/10"
                : "border-gray-700 bg-gray-900/60"
            )}
          >
            <CardContent className="flex flex-row items-center gap-4 py-4">
              {/* Online dot */}
              <span
                className={cn(
                  "w-3 h-3 rounded-full border border-white",
                  isOnline ? "bg-green-500" : "bg-red-500"
                )}
                title={isOnline ? "Online" : "Offline"}
              />
              <div className="flex-1">
                <div className="font-bold text-lg text-white flex items-center gap-2">
                  {team.name}
                  {isTurn && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold">
                      Nominating
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-300">
                  {team.ownerFirstName} {team.ownerLastName}
                </div>
              </div>
              {teamState && (
                <div className="flex flex-col gap-1 text-right min-w-[120px]">
                  <div className="text-xs text-gray-400">Remaining Budget</div>
                  <div className="font-mono text-green-300">
                    ${teamState.remainingBudget}
                  </div>
                  <div className="text-xs text-gray-400">Spots Remaining</div>
                  <div className="font-mono text-blue-300">
                    {teamState.remainingRosterSpots}
                  </div>
                  <div className="text-xs text-gray-400">Max Bid</div>
                  <div className="font-mono text-yellow-300">
                    ${teamState.maxBid}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
