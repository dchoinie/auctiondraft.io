"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NFLPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  team: string;
  searchRank: number;
}

interface AvailablePlayersTableProps {
  players: NFLPlayer[];
  onSelectPlayer: (player: NFLPlayer) => void;
}

export function AvailablePlayersTable({
  players,
  onSelectPlayer,
}: AvailablePlayersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  // Get unique positions and teams for filters
  const positions = [...new Set(players.map((p) => p.position))].sort();
  const teams = [...new Set(players.map((p) => p.team).filter(Boolean))].sort();

  // Filter players based on search and filters
  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      searchTerm === "" ||
      `${player.firstName} ${player.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesPosition =
      positionFilter === "all" || player.position === positionFilter;
    const matchesTeam = teamFilter === "all" || player.team === teamFilter;

    return matchesSearch && matchesPosition && matchesTeam;
  });

  const getPositionColor = (position: string) => {
    switch (position) {
      case "QB":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "RB":
        return "bg-green-100 text-green-800 border-green-200";
      case "WR":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "TE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "K":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DST":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Available Players ({filteredPlayers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Players Table */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-[80px]">Position</TableHead>
                  <TableHead className="w-[80px]">Team</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No players found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player, index) => (
                    <TableRow key={player.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-semibold">
                            {player.firstName} {player.lastName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getPositionColor(player.position)}
                        >
                          {player.position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {player.team || "FA"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectPlayer(player)}
                          className="text-xs"
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
