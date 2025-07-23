import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useLeagueSettings } from "@/stores/leagueStore";
import { useLeagueTeams } from "@/stores/teamStore";
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
  // Assign slots
  const slots: Record<string, (DraftedPlayer | null)[]> = {};
  SLOT_ORDER.forEach((slot) => {
    slots[slot] = [];
  });
  // Direct slots
  ["QB", "RB", "WR", "TE", "K", "DST"].forEach((slot) => {
    for (let i = 0; i < (slotCounts[slot] || 0); i++) {
      const player = grouped[slot].shift();
      slots[slot].push(player || null);
    }
  });
  // FLEX slots
  for (let i = 0; i < (slotCounts["FLEX"] || 0); i++) {
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
  // BENCH slots (any remaining players)
  const benchCount = slotCounts["BENCH"] || 0;
  let benchPlayers: DraftedPlayer[] = [];
  ["QB", "RB", "WR", "TE", "K", "DST"].forEach((pos) => {
    benchPlayers = benchPlayers.concat(grouped[pos]);
  });
  for (let i = 0; i < benchCount; i++) {
    slots["BENCH"].push(benchPlayers.shift() || null);
  }
  return slots;
}

export function RostersTab() {
  const params = useParams();
  const leagueId = params.league_id as string;
  const { settings, loading: settingsLoading } = useLeagueSettings(leagueId);
  const { teams, loading: teamsLoading } = useLeagueTeams(leagueId);
  const draftedPlayers = useDraftedPlayers(leagueId);
  const draftedLoading = useDraftedPlayersStore(
    (s) => s.loading[leagueId] ?? false
  );

  useEffect(() => {
    if (leagueId)
      useDraftedPlayersStore.getState().fetchDraftedPlayers(leagueId);
  }, [leagueId]);

  if (settingsLoading || teamsLoading || draftedLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (!settings || !teams) {
    return <div>Unable to load league data.</div>;
  }

  // Build slot counts for each slot type
  const slotCounts: Record<string, number> = {
    QB: settings.qbSlots,
    RB: settings.rbSlots,
    WR: settings.wrSlots,
    TE: settings.teSlots,
    FLEX: settings.flexSlots,
    K: settings.kSlots,
    DST: settings.dstSlots,
    BENCH: settings.benchSlots,
  };

  // Group drafted players by team
  const playersByTeam: Record<string, DraftedPlayer[]> = {};
  teams.forEach((team) => {
    playersByTeam[team.id] = draftedPlayers.filter((p) => p.teamId === team.id);
  });

  return (
    <div className="grid grid-cols-2 gap-6">
      {teams.map((team) => {
        const slots = assignRosterSlots(playersByTeam[team.id], slotCounts);
        return (
          <div
            key={team.id}
            className="bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100 p-3 rounded-lg"
          >
            <h2 className="text-xl font-bold text-emerald-300">{team.name}</h2>
            <h6 className="text-gray-400 text-sm mb-2">
              {team.ownerFirstName && team.ownerLastName
                ? `${team.ownerFirstName} ${team.ownerLastName}`
                : team.ownerEmail || "Unknown Owner"}
            </h6>
            <table className="min-w-full border-collapse border-none text-sm">
              <thead>
                <tr className="text-left">
                  <th className="border-b text-emerald-300 px-2 py-1">Slot</th>
                  <th className="border-b text-emerald-300 px-2 py-1">
                    Player
                  </th>
                  <th className="border-b text-emerald-300 px-2 py-1">Team</th>
                  <th className="border-b text-emerald-300 px-2 py-1">Price</th>
                </tr>
              </thead>
              <tbody>
                {SLOT_ORDER.map((slot) =>
                  slots[slot].map((player, idx) => (
                    <tr key={slot + idx}>
                      <td className="border-none px-2 py-1">
                        {SLOT_LABELS[slot]}
                      </td>
                      <td className="border-none px-2 py-1">
                        {player ? (
                          `${player.playerFirstName} ${player.playerLastName}`
                        ) : (
                          <span className="text-gray-400">Empty</span>
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
