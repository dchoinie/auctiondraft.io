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
}: {
  player: Player;
  partySocket: PartySocket | null;
  user: { id: string } | null;
  userTeam: Team | null;
  maxBid: number;
}) {
  const minAmount = 1;
  const [amount, setAmount] = useState(minAmount);

  return (
    <TableRow key={player.id}>
      <TableCell>{player.firstName}</TableCell>
      <TableCell>{player.lastName}</TableCell>
      <TableCell>{player.position}</TableCell>
      <TableCell>{player.team || "FA"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-gray-900/80 border-gray-700 text-emerald-100"
            onClick={() => setAmount((prev) => Math.max(minAmount, prev - 1))}
            disabled={amount <= minAmount}
          >
            <Minus className="w-4 h-4 text-emerald-100" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md"
            disabled={!partySocket || !user || !userTeam}
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
            Nominate for ${amount}
          </Button>
          <Button
            size="sm"
            className="bg-gray-900/80 border-gray-700 text-emerald-100"
            onClick={() => setAmount((prev) => prev + 1)}
            disabled={amount >= maxBid}
          >
            <Plus className="w-4 h-4 text-emerald-100" />
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
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [position, setPosition] = useState("ALL");

  const { players, pagination, loading, error, fetchPlayersPage } = usePlayers(
    currentPage,
    PAGE_SIZE
  );
  const draftedPlayers = useDraftedPlayersAuto(leagueId);

  // Find the current user's team for this league
  const userTeam = React.useMemo(() => {
    if (!user) return null;
    return teams.find((t) => t.ownerId === user.id) || null;
  }, [teams, user]);

  // Get maxBid for the current user's team from draftState
  const maxBid = React.useMemo(() => {
    if (!userTeam || !draftState) return 1;
    const teamState = draftState.teams[userTeam.id];
    return teamState?.maxBid ?? 1;
  }, [userTeam, draftState]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Get drafted player IDs for this league
  const draftedPlayerIds = useMemo(
    () => draftedPlayers.map((p) => p.playerId),
    [draftedPlayers]
  );

  // Search results (across all players)
  const {
    players: searchedPlayers,
    loading: searchLoading,
    error: searchError,
  } = usePlayersSearch(debouncedSearch);

  // Filter by position and drafted status
  const filterByPosition = (player: Player) => {
    if (position === "ALL") return true;
    if (position === "D/ST") return player.position === "D/ST";
    return player.position === position;
  };

  // Filter out drafted players and by position
  const availablePlayers = useMemo(() => {
    if (debouncedSearch) {
      return searchedPlayers.filter(
        (player) =>
          !draftedPlayerIds.includes(player.id) && filterByPosition(player)
      );
    }
    return players.filter(
      (player) =>
        !draftedPlayerIds.includes(player.id) && filterByPosition(player)
    );
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
      <div className="p-6 text-emerald-100">
        <Loader2 className="w-4 h-4 animate-spin" />
        Searching players...
      </div>
    );
  }
  if (debouncedSearch && searchError) {
    return <div className="p-6 text-red-500">Error: {searchError}</div>;
  }
  if (!debouncedSearch && loading) {
    return (
      <div className="p-6">
        <div className="p-6 text-emerald-100">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading players...
        </div>
      </div>
    );
  }
  if (!debouncedSearch && error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex gap-2 items-center">
          <div className="relative w-80">
            <Input
              type="text"
              placeholder="Search players by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 pr-10"
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
          <div className="w-40">
            <Select
              value={position}
              onValueChange={(val) => {
                setPosition(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-gray-900/80 border-gray-700 text-emerald-100">
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
      <Table className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 text-emerald-100 placeholder:text-emerald-200/50 shadow-md">
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-50">First Name</TableHead>
            <TableHead className="text-gray-50">Last Name</TableHead>
            <TableHead className="text-gray-50">Position</TableHead>
            <TableHead className="text-gray-50">Team</TableHead>
            <TableHead className="text-gray-50"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availablePlayers.map((player) => {
            return (
              <PlayerRow
                key={player.id}
                player={player}
                partySocket={partySocket}
                user={user}
                userTeam={userTeam}
                maxBid={maxBid}
              />
            );
          })}
        </TableBody>
      </Table>
      {/* Pagination Controls (only show if not searching) */}
      {!debouncedSearch && (
        <>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  const startPage = Math.max(1, pagination.currentPage - 2);
                  const page = startPage + i;
                  if (page > pagination.totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={
                        page === pagination.currentPage ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  );
                }
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-2">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayersTable;
