import { DraftRoomState } from "@/party";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OfflineTeam } from "@/stores/offlineTeamStore";

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
  offlineTeams?: OfflineTeam[];
  onlineUserIds: string[];
  isOfflineMode?: boolean;
}

export default function TeamTracker({
  draftState,
  teams,
  offlineTeams = [],
  onlineUserIds,
  isOfflineMode = false,
}: TeamTrackerProps) {
  if (!draftState) return null;

  // Debug logging
  console.log("TeamTracker - draftState:", {
    draftPhase: draftState.draftPhase,
    teamsCount: Object.keys(draftState.teams || {}).length,
    teams: draftState.teams,
    teamIds: Object.keys(draftState.teams || {}),
  });

  // Combine live and offline teams for display and sort by draft order
  const allTeams = isOfflineMode ? [...teams, ...offlineTeams] : teams;
  const sortedTeams = allTeams.sort((a, b) => (a.draftOrder || 0) - (b.draftOrder || 0));
  
  // Debug logging for team sorting and nomination
  console.log("TeamTracker - team sorting:", {
    isOfflineMode,
    teamsCount: teams.length,
    offlineTeamsCount: offlineTeams.length,
    allTeamsCount: allTeams.length,
    sortedTeamsCount: sortedTeams.length,
    currentNominatorTeamId: draftState.currentNominatorTeamId,
    sortedTeamIds: sortedTeams.map(t => ({ id: t.id, name: t.name, draftOrder: t.draftOrder })),
    nominationOrder: draftState.nominationOrder,
    teams: teams.map(t => ({ id: t.id, name: t.name, draftOrder: t.draftOrder })),
    offlineTeams: offlineTeams.map(t => ({ id: t.id, name: t.name, draftOrder: t.draftOrder })),
  });

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {sortedTeams.map((team: Team | OfflineTeam) => {
        const teamState = draftState.teams[team.id];

        // Debug logging for each team
        console.log(`TeamTracker - team ${team.name}:`, {
          teamId: team.id,
          teamState: teamState,
          hasTeamState: !!teamState,
          remainingBudget: teamState?.remainingBudget,
          remainingRosterSpots: teamState?.remainingRosterSpots,
          maxBid: teamState?.maxBid,
          draftStateTeamsCount: Object.keys(draftState.teams || {}).length,
          draftStateTeamIds: Object.keys(draftState.teams || {}),
        });

                 const isTurn = draftState.currentNominatorTeamId === team.id;
         // For offline teams, always show as online since they don't have ownerId
         const isOnline = 'ownerId' in team ? onlineUserIds.includes(team.ownerId) : true;
         
         // Debug logging for turn highlighting
         if (isTurn) {
           console.log(`TeamTracker - highlighting team ${team.name} (${team.id}) as current nominator`);
         }
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
            <CardContent className="flex flex-row items-center gap-2 sm:gap-4 py-3 sm:py-4">
              {/* Online dot */}
              <span
                className={cn(
                  "w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-white flex-shrink-0",
                  isOnline ? "bg-green-500" : "bg-red-500"
                )}
                title={isOnline ? "Online" : "Offline"}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm sm:text-lg text-white flex items-center gap-1 sm:gap-2 flex-wrap">
                  <span className="truncate">{team.name}</span>
                  {isTurn && (
                    <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold whitespace-nowrap">
                      Nominating
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-300 truncate">
                  {'ownerFirstName' in team ? `${team.ownerFirstName} ${team.ownerLastName}` : 'Offline Team'}
                </div>
              </div>
              {teamState && (
                <div className="flex flex-col gap-1 text-right min-w-[80px] sm:min-w-[120px] flex-shrink-0">
                  <div className="text-xs text-gray-400">Budget</div>
                  <div className="font-mono text-green-300 text-xs sm:text-sm">
                    ${teamState.remainingBudget}
                  </div>
                  <div className="text-xs text-gray-400">Spots</div>
                  <div className="font-mono text-blue-300 text-xs sm:text-sm">
                    {teamState.remainingRosterSpots}
                  </div>
                  <div className="text-xs text-gray-400">Max Bid</div>
                  <div className="font-mono text-yellow-300 text-xs sm:text-sm">
                    ${teamState.maxBid}
                  </div>
                </div>
              )}
              {!teamState && (
                <div className="flex flex-col gap-1 text-right min-w-[80px] sm:min-w-[120px] flex-shrink-0">
                  <div className="text-xs text-gray-400">No Data</div>
                  <div className="text-xs text-gray-500">-</div>
                  <div className="text-xs text-gray-500">-</div>
                  <div className="text-xs text-gray-500">-</div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
