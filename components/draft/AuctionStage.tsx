import React from "react";
import { DraftRoomState } from "@/party";
import { Team } from "@/stores/teamStore";
import { OfflineTeam } from "@/stores/offlineTeamStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Minus, Plus, Volume2, VolumeX, Check } from "lucide-react";
import PartySocket from "partysocket";
import LeagueTimer from "./LeagueTimer";

interface AuctionStageProps {
  draftState: DraftRoomState | null;
  teams: Team[];
  offlineTeams?: OfflineTeam[];
  partySocket: PartySocket | null;
  user: { id: string } | null;
  isOfflineMode?: boolean;
}

export default function AuctionStage({
  draftState,
  teams,
  offlineTeams = [],
  partySocket,
  user,
  isOfflineMode = false,
}: AuctionStageProps) {
  const {
    nominatedPlayer,
    currentBid,
    bidTimer,
    bidTimerExpiresAt,
    auctionPhase,
    currentRound,
    currentPick,
  } = draftState || {};

  // Find the team name for the current highest bid
  let highestBidTeamName = "-";
  const minBid = currentBid?.amount ? currentBid.amount + 1 : 1;
  const [bidAmount, setBidAmount] = useState(minBid);
  const [isSpeechMuted, setIsSpeechMuted] = useState(false);
  
  // Offline mode state
  const [offlineWinningTeam, setOfflineWinningTeam] = useState<string>("");
  const [offlineWinningAmount, setOfflineWinningAmount] = useState<number>(1);

  // Keep bidAmount in sync with minBid if nominated player or currentBid changes
  React.useEffect(() => {
    setBidAmount(minBid);
  }, [minBid, nominatedPlayer?.id]);

  if (currentBid?.teamId) {
    const team = teams.find((t) => t.id === currentBid.teamId);
    highestBidTeamName = team?.name || "-";
  }

  // Find the current user's team
  const userTeam = React.useMemo(() => {
    if (!user) return null;
    return teams.find((t) => t.ownerId === user.id) || null;
  }, [teams, user]);

  // Determine if the bid button should be enabled
  const canBid = !!(
    partySocket &&
    user &&
    userTeam &&
    nominatedPlayer &&
    bidAmount >= minBid
  );

  // Use actual bid history from draftState
  const bidHistory = draftState?.bidHistory || [];

  // Helper to get team name by id
  const getTeamName = (teamId: string) =>
    teams.find((t) => t.id === teamId)?.name || "-";

  // Determine if countdown can be triggered
  const canTriggerCountdown =
    partySocket &&
    draftState?.nominatedPlayer &&
    draftState.auctionPhase === "idle";

  const toggleSpeech = () => {
    setIsSpeechMuted(!isSpeechMuted);
    // No need to send to party since this is a per-user preference
  };

  // Offline mode handlers
  const handleOfflineAuctionComplete = () => {
    if (!offlineWinningTeam || offlineWinningAmount <= 0 || !partySocket) return;
    
    partySocket.send(
      JSON.stringify({
        type: "offlineAuctionComplete",
        data: {
          teamId: offlineWinningTeam,
          amount: offlineWinningAmount,
        },
      })
    );
    
    // Reset form
    setOfflineWinningTeam("");
    setOfflineWinningAmount(1);
  };

  // Get all teams (live + offline) for offline mode
  const allTeams = isOfflineMode ? [...teams, ...offlineTeams] : teams;

  return (
    <div className="mb-4 sm:mb-8 w-full p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md rounded-xl">
      {/* Volume Control */}
      <div className="flex justify-end mb-3 sm:mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSpeech}
          className={`p-1 sm:p-2 rounded-full ${
            !isSpeechMuted
              ? "bg-green-900/60 text-green-300 border-green-400"
              : "bg-gray-900/60 text-gray-400 border-gray-600"
          } border`}
          title={
            isSpeechMuted ? "Enable auction voice" : "Disable auction voice"
          }
        >
          {isSpeechMuted ? (
            <VolumeX size={14} className="sm:w-4 sm:h-4" />
          ) : (
            <Volume2 size={14} className="sm:w-4 sm:h-4" />
          )}
        </Button>
      </div>

      {/* Round and Pick Info */}
      <div className="flex justify-center mb-3 sm:mb-4">
        <div className="text-lg sm:text-xl font-semibold text-emerald-300">
          Round {currentRound || 1} • Pick {currentPick || 1}
        </div>
      </div>

      {/* League Timer */}
      <LeagueTimer
        bidTimer={bidTimer || null}
        bidTimerExpiresAt={bidTimerExpiresAt || null}
        auctionPhase={auctionPhase || "idle"}
      />

      {/* Nominated Player */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <div className="text-lg sm:text-xl lg:text-2xl font-semibold text-emerald-300 mb-1">
            Nominated Player
          </div>
          {nominatedPlayer ? (
            <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-yellow-100 font-extrabold drop-shadow-lg">
              {nominatedPlayer.name}{" "}
              <span className="text-yellow-400 text-sm sm:text-lg lg:text-xl xl:text-2xl font-semibold">
                ({nominatedPlayer.team} - {nominatedPlayer.position})
              </span>
            </div>
          ) : (
            <div className="text-yellow-200 italic text-sm sm:text-base">
              No player nominated yet.
            </div>
          )}
        </div>
        {/* Current Highest Bid */}
        <div className="flex-1 text-center lg:text-right">
          <div className="text-lg sm:text-xl lg:text-2xl font-semibold text-emerald-300 mb-1">
            Current Highest Bid
          </div>
          {currentBid ? (
            <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-yellow-100 drop-shadow-lg">
              ${currentBid.amount}
              <div className="text-yellow-400 text-sm sm:text-lg lg:text-xl xl:text-2xl font-semibold mt-1">
                by {highestBidTeamName}
              </div>
            </div>
          ) : (
            <div className="text-yellow-200 italic text-sm sm:text-base">
              No bids yet.
            </div>
          )}
        </div>
      </div>
      {/* Bidding Interface */}
      {isOfflineMode ? (
        // Offline Mode Bidding Interface
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="winning-team" className="text-emerald-300 font-semibold">
                Winning Team
              </Label>
              <Select value={offlineWinningTeam} onValueChange={setOfflineWinningTeam}>
                <SelectTrigger className="bg-gray-900/80 border-gray-700 text-emerald-100">
                  <SelectValue placeholder="Select winning team" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/80 border-gray-700">
                  {allTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-emerald-100">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="winning-amount" className="text-emerald-300 font-semibold">
                Winning Amount ($)
              </Label>
              <Input
                id="winning-amount"
                type="number"
                value={offlineWinningAmount}
                onChange={(e) => setOfflineWinningAmount(Number(e.target.value))}
                min={1}
                className="bg-gray-900/80 border-gray-700 text-emerald-100"
              />
            </div>
            <Button
              onClick={handleOfflineAuctionComplete}
              disabled={!offlineWinningTeam || offlineWinningAmount <= 0 || !partySocket}
              className="w-full bg-gradient-to-br from-green-900/80 to-green-700/80 border-2 border-green-400 shadow-md text-green-100 font-bold px-4 py-2"
            >
              <Check className="w-4 h-4 mr-2" />
              Complete Auction
            </Button>
          </div>
        </div>
      ) : (
        // Live Mode Bidding Interface
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-gray-900/80 border-gray-700 text-emerald-100 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setBidAmount((prev) => Math.max(minBid, prev - 1))}
              disabled={bidAmount <= minBid}
            >
              <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-100" />
            </Button>
            <Button
              className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md text-yellow-100 font-bold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-base sm:text-lg"
              disabled={!canBid}
              onClick={() => {
                if (!canBid) return;
                partySocket.send(
                  JSON.stringify({
                    type: "placeBid",
                    data: {
                      teamId: userTeam!.id,
                      amount: bidAmount,
                    },
                  })
                );
              }}
            >
              Bid ${bidAmount}
            </Button>
            <Button
              size="sm"
              className="bg-gray-900/80 border-gray-700 text-emerald-100 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setBidAmount((prev) => prev + 1)}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-100" />
            </Button>
          </div>
        </div>
      )}

      {/* Bid History - Only show in live mode */}
      {!isOfflineMode && bidHistory.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <div className="text-lg sm:text-xl font-semibold text-emerald-300 mb-2 sm:mb-3">
            Bid History
          </div>
          <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-gray-800/50 rounded-lg p-2 sm:p-3">
            {bidHistory.slice(-10).map((bid, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-1 text-sm sm:text-base"
              >
                <span className="text-gray-300">
                  {getTeamName(bid.teamId)}: ${bid.amount}
                </span>
                <span className="text-gray-500 text-xs sm:text-sm">
                  {new Date(bid.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Countdown Trigger - Only show in live mode */}
      {!isOfflineMode && canTriggerCountdown && (
        <div className="mt-4 sm:mt-6 text-center">
          <Button
            onClick={() => {
              partySocket.send(JSON.stringify({ type: "triggerCountdown" }));
            }}
            className="bg-gradient-to-br from-red-900/80 to-red-700/80 border-2 border-red-400 shadow-md text-red-100 font-bold px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
          >
            Start Countdown
          </Button>
        </div>
      )}
    </div>
  );
}
