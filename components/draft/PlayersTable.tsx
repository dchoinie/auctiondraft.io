import React, { useState, useEffect, useMemo } from "react";
import { usePlayers, usePlayersSearch } from "@/stores/playersStore";
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
import { Loader2, X } from "lucide-react";

interface PlayersTableProps {
  leagueId: string;
}

const PAGE_SIZE = 50;

const PlayersTable: React.FC<PlayersTableProps> = ({ leagueId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { players, pagination, loading, error, fetchPlayersPage } = usePlayers(
    currentPage,
    PAGE_SIZE
  );
  const draftedPlayers = useDraftedPlayersAuto(leagueId);

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

  // Filter out drafted players from search or paginated list
  const availablePlayers = useMemo(() => {
    if (debouncedSearch) {
      return searchedPlayers.filter(
        (player) => !draftedPlayerIds.includes(player.id)
      );
    }
    return players.filter((player) => !draftedPlayerIds.includes(player.id));
  }, [debouncedSearch, searchedPlayers, players, draftedPlayerIds]);

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
      <div className="mb-4 flex justify-between items-center">
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
                  const input = document.getElementById("players-search-input");
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
      </div>
      <Table className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 shadow-md">
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
          {availablePlayers.map((player) => (
            <TableRow key={player.id}>
              <TableCell>{player.firstName}</TableCell>
              <TableCell>{player.lastName}</TableCell>
              <TableCell>{player.position}</TableCell>
              <TableCell>{player.team || "FA"}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md"
                >
                  Nominate
                </Button>
              </TableCell>
            </TableRow>
          ))}
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
