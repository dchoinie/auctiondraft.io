import React, { useState, useEffect, useMemo } from "react";
import { usePlayers, usePlayersSearch, Player } from "@/stores/playersStore";
import { useDraftedPlayersAuto } from "@/stores/draftedPlayersStore";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, X, Minus, Plus } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import PartySocket from "partysocket";
import { Team } from "@/stores/teamStore";

interface PlayersTableProps {
  leagueId: string;
  partySocket: PartySocket | null;
  user: { id: string } | null;
  teams: Team[];
  draftState: import("@/party").DraftRoomState | null;
}

const PAGE_SIZE = 50;

const POSITION_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "QB", label: "QB" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
  { value: "K", label: "K" },
  { value: "D/ST", label: "D/ST" },
];

const PlayerRow = React.memo(function PlayerRow({
  player,
  partySocket,
  user,
  userTeam,
  maxBid,
  isCurrentNominator,
}: {
  player: Player;
  partySocket: PartySocket | null;
  user: { id: string } | null;
  userTeam: Team | null;
  maxBid: number;
  isCurrentNominator: boolean;
}) {
  const minAmount = 1;
  const [amount, setAmount] = useState(minAmount);

  return (
    <TableRow key={player.id}>
      <TableCell className="text-xs sm:text-sm">{player.firstName}</TableCell>
      <TableCell className="text-xs sm:text-sm">{player.lastName}</TableCell>
      <TableCell className="text-xs sm:text-sm">{player.position}</TableCell>
      <TableCell className="text-xs sm:text-sm">
        {player.team || "FA"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            size="sm"
            className="bg-gray-900/80 border-gray-700 text-emerald-100 h-6 w-6 sm:h-8 sm:w-8 p-0"
            onClick={() => setAmount((prev) => Math.max(minAmount, prev - 1))}
            disabled={amount <= minAmount}
          >
            <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-100" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            disabled={!partySocket || !user || !userTeam || !isCurrentNominator}
            onClick={() => {
              if (!partySocket || !user || !userTeam) return;
              partySocket.send(
                JSON.stringify({
                  type: "nominatePlayer",
                  data: {
                    teamId: userTeam.id,
                    amount,
                    player: {
                      id: player.id,
                      firstName: player.firstName,
                      lastName: player.lastName,
                      team: player.team,
                      position: player.position,
                    },
                  },
                })
              );
            }}
          >
            Nominate ${amount}
          </Button>
          <Button
            size="sm"
            className="bg-gray-900/80 border-gray-700 text-emerald-100 h-6 w-6 sm:h-8 sm:w-8 p-0"
            onClick={() => setAmount((prev) => prev + 1)}
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-100" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

const PlayersTable: React.FC<PlayersTableProps> = ({
  leagueId,
  partySocket,
  user,
  teams,
  draftState,
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Get players from store
  const { players, loading, error, fetchPlayersPage } = usePlayers();
  const {
    players: searchedPlayers,
    loading: searchLoading,
    error: searchError,
  } = usePlayersSearch();
  const { draftedPlayerIds } = useDraftedPlayersAuto(leagueId);

  // Find the current user's team
  const userTeam = useMemo(() => {
    if (!user) return null;
    return teams.find((t) => t.ownerId === user.id) || null;
  }, [teams, user]);

  // Check if current user is the nominator
  const isCurrentNominator = useMemo(() => {
    if (!userTeam || !draftState) return false;
    return draftState.currentNominatorTeamId === userTeam.id;
  }, [userTeam, draftState]);

  // Get max bid for user's team
  const maxBid = useMemo(() => {
    if (!userTeam || !draftState?.teams) return 0;
    const teamState = draftState.teams[userTeam.id];
    return teamState?.maxBid || 0;
  }, [userTeam, draftState]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Filter players based on search and position
  const filteredPlayers = useMemo(() => {
    const playersToFilter = debouncedSearch ? searchedPlayers : players;

    return playersToFilter.filter((player) => {
      // Filter out drafted players
      if (draftedPlayerIds.includes(player.id)) {
        return false;
      }

      // Filter by position
      if (position !== "ALL" && player.position !== position) {
        return false;
      }

      return true;
    });
  }, [debouncedSearch, searchedPlayers, players, draftedPlayerIds, position]);

  useEffect(() => {
    fetchPlayersPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (debouncedSearch && searchLoading) {
    return (
      <div className="p-4 sm:p-6 text-emerald-100">
        <Loader2 className="w-4 h-4 animate-spin" />
        Searching players...
      </div>
    );
  }
  if (debouncedSearch && searchError) {
    return <div className="p-4 sm:p-6 text-red-500">Error: {searchError}</div>;
  }
  if (!debouncedSearch && loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="p-4 sm:p-6 text-emerald-100">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading players...
        </div>
      </div>
    );
  }
  if (!debouncedSearch && error) {
    return <div className="p-4 sm:p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <Input
              type="text"
              placeholder="Search players by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 pr-10 text-sm sm:text-base"
              autoComplete="off"
              id="players-search-input"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setTimeout(() => {
                    const input = document.getElementById(
                      "players-search-input"
                    );
                    if (input) (input as HTMLInputElement).focus();
                  }, 0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-emerald-400 focus:outline-none"
                tabIndex={0}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={position}
              onValueChange={(val) => {
                setPosition(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-gray-900/80 border-gray-700 text-emerald-100 text-sm sm:text-base">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 text-emerald-100 placeholder:text-emerald-200/50 shadow-md min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-50 text-xs sm:text-sm">
                First Name
              </TableHead>
              <TableHead className="text-gray-50 text-xs sm:text-sm">
                Last Name
              </TableHead>
              <TableHead className="text-gray-50 text-xs sm:text-sm">
                Position
              </TableHead>
              <TableHead className="text-gray-50 text-xs sm:text-sm">
                Team
              </TableHead>
              <TableHead className="text-gray-50 text-xs sm:text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.slice(0, PAGE_SIZE).map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                partySocket={partySocket}
                user={user}
                userTeam={userTeam}
                maxBid={maxBid}
                isCurrentNominator={isCurrentNominator}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-8 text-emerald-200">
          No players found matching your criteria.
        </div>
      )}

      {filteredPlayers.length > PAGE_SIZE && (
        <div className="mt-4 flex justify-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-emerald-200">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={filteredPlayers.length <= PAGE_SIZE}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayersTable;
