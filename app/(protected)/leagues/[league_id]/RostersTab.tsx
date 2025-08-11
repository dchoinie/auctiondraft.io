import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useLeagueStore } from "@/stores/leagueStore";
import { useLeagueTeams } from "@/stores/teamStore";
import { useOfflineTeamStore } from "@/stores/offlineTeamStore";
import {
  useDraftedPlayersStore,
  useDraftedPlayers,
  DraftedPlayer,
} from "@/stores/draftedPlayersStore";
import { Loader2 } from "lucide-react";

const SLOT_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "K", "DST", "BENCH"];

const SLOT_LABELS: Record<string, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  FLEX: "FLEX",
  K: "K",
  DST: "D/ST",
  BENCH: "Bench",
};

const FLEX_POSITIONS = ["RB", "WR", "TE"];

function assignRosterSlots(
  draftedPlayers: DraftedPlayer[],
  slotCounts: Record<string, number>
) {
  // Group drafted players by position
  const grouped: Record<string, DraftedPlayer[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
    DST: [],
    FLEX: [],
    BENCH: [],
  };
  draftedPlayers.forEach((p) => {
    if (grouped[p.playerPosition]) grouped[p.playerPosition].push(p);
    else if (p.playerPosition === "DEF" || p.playerPosition === "DST")
      grouped["DST"].push(p);
    else grouped["BENCH"].push(p); // fallback
  });
  
  // Assign slots - only create slots for positions with count > 0
  const slots: Record<string, (DraftedPlayer | null)[]> = {};
  
  // Direct slots - only create if count > 0
  ["QB", "RB", "WR", "TE", "K", "DST"].forEach((slot) => {
    const count = slotCounts[slot] || 0;
    if (count > 0) {
      slots[slot] = [];
      for (let i = 0; i < count; i++) {
        const player = grouped[slot].shift();
        slots[slot].push(player || null);
      }
    }
  });
  
  // FLEX slots - only create if count > 0
  const flexCount = slotCounts["FLEX"] || 0;
  if (flexCount > 0) {
    slots["FLEX"] = [];
    for (let i = 0; i < flexCount; i++) {
      // Try to fill with RB, WR, TE in order
      let player: DraftedPlayer | null = null;
      for (const pos of FLEX_POSITIONS) {
        if (grouped[pos].length > 0) {
          player = grouped[pos].shift()!;
          break;
        }
      }
      slots["FLEX"].push(player || null);
    }
  }
  
  // BENCH slots - only create if count > 0
  const benchCount = slotCounts["BENCH"] || 0;
  if (benchCount > 0) {
    slots["BENCH"] = [];
    let benchPlayers: DraftedPlayer[] = [];
    ["QB", "RB", "WR", "TE", "K", "DST"].forEach((pos) => {
      benchPlayers = benchPlayers.concat(grouped[pos]);
    });
    for (let i = 0; i < benchCount; i++) {
      slots["BENCH"].push(benchPlayers.shift() || null);
    }
  }
  
  return slots;
}

export function RostersTab() {
  const params = useParams();
  const leagueId = params.league_id as string;
  const league = useLeagueStore((s) => s.leagues.find(l => l.id === leagueId));
  const { teams, loading: teamsLoading } = useLeagueTeams(leagueId);
  const { teams: offlineTeams, loading: offlineTeamsLoading, fetchTeams: fetchOfflineTeams } = useOfflineTeamStore();
  const draftedPlayers = useDraftedPlayers(leagueId);
  const draftedLoading = useDraftedPlayersStore(
    (s) => s.loading[leagueId] ?? false
  );

  // Check if league is in offline mode - use optional chaining to avoid errors
  const isOfflineMode = league?.settings?.draftMode === "offline";

  useEffect(() => {
    if (leagueId) {
      useDraftedPlayersStore.getState().fetchDraftedPlayers(leagueId);
    }
  }, [leagueId]);

  // Fetch offline teams when in offline mode
  useEffect(() => {
    if (isOfflineMode && leagueId) {
      fetchOfflineTeams(leagueId);
    }
  }, [isOfflineMode, leagueId, fetchOfflineTeams]);

  // Simple loading guard - only check for essential data
  if (!leagueId || !league || !league.settings) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  if (!league || !league.settings) {
    return <div>Unable to load league data.</div>;
  }

  // Build slot counts for each slot type
  const slotCounts: Record<string, number> = {
    QB: league.settings.qbSlots,
    RB: league.settings.rbSlots,
    WR: league.settings.wrSlots,
    TE: league.settings.teSlots,
    FLEX: league.settings.flexSlots,
    K: league.settings.kSlots,
    DST: league.settings.dstSlots,
    BENCH: league.settings.benchSlots,
  };

  // Debug logging
  console.log("🔍 RostersTab Debug:", {
    leagueSettings: {
      qbSlots: league.settings.qbSlots,
      rbSlots: league.settings.rbSlots,
      wrSlots: league.settings.wrSlots,
      teSlots: league.settings.teSlots,
      flexSlots: league.settings.flexSlots,
      kSlots: league.settings.kSlots,
      dstSlots: league.settings.dstSlots,
      benchSlots: league.settings.benchSlots,
    },
    calculatedSlotCounts: slotCounts,
    totalSlots: Object.values(slotCounts).reduce((sum, count) => sum + count, 0),
    teamsCount: teams.length,
    draftedPlayersCount: draftedPlayers.length,
  });

  // Get all teams (live + offline) for offline mode
  const allTeams = isOfflineMode ? [...teams, ...offlineTeams] : teams;

  if (!allTeams.length) {
    return (
      <div className="text-center text-gray-400 py-8">
        {isOfflineMode 
          ? "No offline teams created yet. Create teams in the Teams tab first."
          : "No teams found in this league."
        }
      </div>
    );
  }

  // Group drafted players by team
  const playersByTeam: Record<string, DraftedPlayer[]> = {};
  allTeams.forEach((team) => {
    playersByTeam[team.id] = draftedPlayers.filter((p) => p.teamId === team.id);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {allTeams.map((team) => {
        const slots = assignRosterSlots(playersByTeam[team.id], slotCounts);
        const totalSlots = Object.values(slotCounts).reduce((sum, count) => sum + count, 0);
        const filledSlots = draftedPlayers.filter(p => p.teamId === team.id).length;
        
        return (
          <div
            key={team.id}
            className="bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100 p-4 rounded-lg"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-300">{team.name}</h2>
                {'ownerFirstName' in team && 'ownerLastName' in team && team.ownerFirstName && team.ownerLastName ? (
                  <h6 className="text-gray-400 text-sm">
                    {team.ownerFirstName} {team.ownerLastName}
                  </h6>
                ) : 'ownerEmail' in team && team.ownerEmail ? (
                  <h6 className="text-gray-400 text-sm">{team.ownerEmail}</h6>
                ) : isOfflineMode ? (
                  <h6 className="text-gray-400 text-sm">Offline Team</h6>
                ) : (
                  <h6 className="text-gray-400 text-sm">Unknown Owner</h6>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-emerald-300">
                  {filledSlots}/{totalSlots} Players
                </div>
                {isOfflineMode && 'budget' in team && (
                  <div className="text-xs text-gray-400">
                    Budget: ${team.budget}
                  </div>
                )}
              </div>
            </div>
            <table className="min-w-full border-collapse border-none text-sm">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-emerald-700 text-emerald-300 px-2 py-1">Slot</th>
                  <th className="border-b border-emerald-700 text-emerald-300 px-2 py-1">
                    Player
                  </th>
                  <th className="border-b border-emerald-700 text-emerald-300 px-2 py-1">Team</th>
                  <th className="border-b border-emerald-700 text-emerald-300 px-2 py-1">Price</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(slots).map(([slot, slotPlayers]) =>
                  slotPlayers.map((player, idx) => (
                    <tr key={slot + idx} className="hover:bg-emerald-800/20">
                      <td className="border-none px-2 py-1 text-emerald-200">
                        {SLOT_LABELS[slot]}
                      </td>
                      <td className="border-none px-2 py-1">
                        {player ? (
                          `${player.playerFirstName} ${player.playerLastName}`
                        ) : (
                          <span className="text-gray-500 italic">Empty</span>
                        )}
                      </td>
                      <td className="border-none px-2 py-1">
                        {player ? player.playerTeam : ""}
                      </td>
                      <td className="border-none px-2 py-1">
                        {player ? `$${player.draftPrice}` : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
