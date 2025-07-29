import React from "react";
import { useParams } from "next/navigation";
import { useLeagueTeams, Team } from "@/stores/teamStore";
import { useLeagueSettings } from "@/stores/leagueStore";
import {
  useDraftedPlayersAuto,
  DraftedPlayer,
} from "@/stores/draftedPlayersStore";
import { usePlayersStore, Player } from "@/stores/playersStore";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LeagueSettings } from "@/stores/leagueStore";

type GetPlayerById = (id: string) => Player | undefined;

function buildRosterSlots(settings: LeagueSettings): string[] {
  const slots: string[] = [];
  for (let i = 0; i < (settings.qbSlots || 0); i++) slots.push("QB");
  for (let i = 0; i < (settings.rbSlots || 0); i++) slots.push("RB");
  for (let i = 0; i < (settings.wrSlots || 0); i++) slots.push("WR");
  for (let i = 0; i < (settings.teSlots || 0); i++) slots.push("TE");
  for (let i = 0; i < (settings.flexSlots || 0); i++) slots.push("FLEX");
  for (let i = 0; i < (settings.dstSlots || 0); i++) slots.push("DST");
  for (let i = 0; i < (settings.kSlots || 0); i++) slots.push("K");
  for (let i = 0; i < (settings.benchSlots || 0); i++) slots.push("BENCH");
  return slots;
}

function getPlayerPosition(
  player: DraftedPlayer,
  getPlayerById: GetPlayerById
): string {
  if (player.playerPosition) return player.playerPosition;
  const storePlayer = getPlayerById(player.playerId);
  return storePlayer?.position || "";
}

function assignPlayersToSlots(
  slots: string[],
  players: DraftedPlayer[],
  getPlayerById: GetPlayerById
): (DraftedPlayer | null)[] {
  const filled: (DraftedPlayer | null)[] = Array(slots.length).fill(null);
  const used: boolean[] = Array(players.length).fill(false);

  ["QB", "RB", "WR", "TE", "DST", "K"].forEach((pos) => {
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === pos && !filled[i]) {
        const idx = players.findIndex(
          (p: DraftedPlayer, j: number) =>
            !used[j] &&
            getPlayerPosition(p, getPlayerById).toUpperCase() === pos
        );
        if (idx !== -1) {
          filled[i] = players[idx];
          used[idx] = true;
        }
      }
    }
  });

  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === "FLEX" && !filled[i]) {
      const idx = players.findIndex(
        (p: DraftedPlayer, j: number) =>
          !used[j] &&
          ["RB", "WR", "TE"].includes(
            getPlayerPosition(p, getPlayerById).toUpperCase()
          )
      );
      if (idx !== -1) {
        filled[i] = players[idx];
        used[idx] = true;
      }
    }
  }

  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === "BENCH" && !filled[i]) {
      const idx = players.findIndex((_: DraftedPlayer, j: number) => !used[j]);
      if (idx !== -1) {
        filled[i] = players[idx];
        used[idx] = true;
      }
    }
  }

  return filled;
}

export default function Rosters() {
  const { league_id: rawLeagueId } = useParams();
  const league_id = Array.isArray(rawLeagueId) ? rawLeagueId[0] : rawLeagueId;
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
  } = useLeagueTeams(league_id);
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
  } = useLeagueSettings(league_id);
  const draftedPlayers = useDraftedPlayersAuto(league_id);
  const getPlayerById = usePlayersStore((state) => state.getPlayerById);

  if (teamsLoading || settingsLoading)
    return (
      <div className="p-4 sm:p-6 text-emerald-100">Loading rosters...</div>
    );
  if (teamsError || settingsError)
    return (
      <div className="p-4 sm:p-6 text-red-500">
        Error loading rosters: {teamsError || settingsError}
      </div>
    );
  if (!settings || !teams.length)
    return (
      <div className="p-4 sm:p-6 text-emerald-100">
        No teams or settings found.
      </div>
    );

  const slots = buildRosterSlots(settings);

  // Build a map: teamId -> drafted players
  const teamPlayers: Record<string, DraftedPlayer[]> = {};
  teams.forEach((team) => {
    teamPlayers[team.id] = draftedPlayers.filter((p) => p.teamId === team.id);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {teams.map((team) => {
        const players = teamPlayers[team.id] || [];
        const assigned = assignPlayersToSlots(slots, players, getPlayerById);
        return (
          <Card
            key={team.id}
            className="h-full bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100"
          >
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg lg:text-xl">
                {team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-50 text-xs sm:text-sm">
                        Slot
                      </TableHead>
                      <TableHead className="text-gray-50 text-xs sm:text-sm">
                        Player
                      </TableHead>
                      <TableHead className="text-gray-50 text-xs sm:text-sm">
                        Price
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot, i) => {
                      const player = assigned[i];
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-xs sm:text-sm">
                            {slot}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {player ? (
                              <span className="font-medium text-emerald-300">
                                {player.playerFirstName} {player.playerLastName}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {player ? (
                              <span className="text-emerald-300">
                                ${player.draftPrice}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
