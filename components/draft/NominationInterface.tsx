"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, DollarSign, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NFLPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  team: string;
  searchRank: number;
}

interface UserTeam {
  id: string;
  name: string;
  remainingBudget: number;
}

interface NominationInterfaceProps {
  onNominate: (playerId: string, playerName: string, amount: number) => void;
  userTeam: UserTeam;
  availablePlayers: NFLPlayer[];
  disabled?: boolean;
}

export function NominationInterface({
  onNominate,
  userTeam,
  availablePlayers,
  disabled = false,
}: NominationInterfaceProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<NFLPlayer | null>(null);
  const [nominationAmount, setNominationAmount] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePlayerSelect = (player: NFLPlayer) => {
    setSelectedPlayer(player);
    setDialogOpen(false);
  };

  const handleNominate = async () => {
    if (!selectedPlayer) {
      setError("Please select a player to nominate");
      return;
    }

    if (nominationAmount < 1) {
      setError("Nomination amount must be at least $1");
      return;
    }

    if (nominationAmount > userTeam.remainingBudget) {
      setError("Nomination amount exceeds your remaining budget");
      return;
    }

    try {
      setError(null);
      const playerName = `${selectedPlayer.firstName} ${selectedPlayer.lastName}`;
      await onNominate(selectedPlayer.id, playerName, nominationAmount);

      // Reset form
      setSelectedPlayer(null);
      setNominationAmount(1);
    } catch (err) {
      setError("Failed to nominate player");
    }
  };

  const filteredPlayers = availablePlayers.filter((player) => {
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
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
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Your Turn to Nominate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Team Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{userTeam.name}</p>
                <p className="text-sm text-muted-foreground">Your team</p>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-semibold">
                  ${userTeam.remainingBudget}
                </span>
                <span className="text-sm text-muted-foreground">remaining</span>
              </div>
            </div>
          </div>

          {/* Player Selection */}
          <div className="space-y-2">
            <Label htmlFor="player-select">Select Player</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                {selectedPlayer ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                    <div>
                      <p className="font-semibold">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={getPositionColor(selectedPlayer.position)}
                        >
                          {selectedPlayer.position}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {selectedPlayer.team || "FA"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPlayer(null)}
                      disabled={disabled}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                    No player selected
                  </div>
                )}
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={disabled}>
                    <Plus className="h-4 w-4 mr-2" />
                    Select Player
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select a Player to Nominate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Players List */}
                    <ScrollArea className="h-[400px]">
                      {filteredPlayers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No players found
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => handlePlayerSelect(player)}
                            >
                              <div>
                                <p className="font-semibold">
                                  {player.firstName} {player.lastName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={getPositionColor(
                                      player.position
                                    )}
                                  >
                                    {player.position}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {player.team || "FA"}
                                  </span>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Select
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Nomination Amount */}
          <div className="space-y-2">
            <Label htmlFor="nomination-amount">Nomination Amount</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nomination-amount"
                  type="number"
                  min="1"
                  max={userTeam.remainingBudget}
                  value={nominationAmount}
                  onChange={(e) =>
                    setNominationAmount(parseInt(e.target.value) || 1)
                  }
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNominationAmount(1)}
                disabled={disabled}
              >
                Min ($1)
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Maximum: ${userTeam.remainingBudget}
            </p>
          </div>

          {/* Nominate Button */}
          <Button
            onClick={handleNominate}
            disabled={!selectedPlayer || nominationAmount < 1 || disabled}
            className="w-full"
            size="lg"
          >
            {disabled
              ? "Saving..."
              : `Nominate Player for $${nominationAmount}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
