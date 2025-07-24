import React from "react";
import { DraftRoomState } from "@/party";
import { Team } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface AuctionStageProps {
  draftState: DraftRoomState | null;
  teams: Team[];
}

// Mocked bid history for now
const mockBidHistory = [
  { amount: 32, teamName: "Team Alpha", timestamp: "2024-05-01 12:01:10" },
  { amount: 30, teamName: "Team Beta", timestamp: "2024-05-01 12:01:05" },
  { amount: 28, teamName: "Team Gamma", timestamp: "2024-05-01 12:01:00" },
  { amount: 25, teamName: "Team Delta", timestamp: "2024-05-01 12:00:55" },
  { amount: 20, teamName: "Team Epsilon", timestamp: "2024-05-01 12:00:50" },
];

export default function AuctionStage({ draftState, teams }: AuctionStageProps) {
  // Find the team name for the current highest bid
  let highestBidTeamName = "-";
  const minBid = draftState?.currentBid?.amount
    ? draftState.currentBid.amount + 1
    : 1;
  const [bidAmount, setBidAmount] = useState(minBid);

  // Keep bidAmount in sync with minBid if nominated player or currentBid changes
  React.useEffect(() => {
    setBidAmount(minBid);
  }, [minBid, draftState?.nominatedPlayer?.id]);

  if (draftState?.currentBid?.teamId) {
    const team = teams.find((t) => t.id === draftState.currentBid?.teamId);
    highestBidTeamName = team?.name || "-";
  }

  return (
    <div className="mb-8 w-full p-6 bg-gradient-to-br from-gray-900/80 to-gray-700/80 border-2 border-gray-400 shadow-md rounded-xl">
      {/* Nominated Player */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="text-2xl font-semibold text-emerald-300 mb-1">
            Nominated Player
          </div>
          {draftState?.nominatedPlayer ? (
            <div className="text-3xl md:text-4xl text-yellow-100 font-extrabold drop-shadow-lg">
              {draftState.nominatedPlayer.name}{" "}
              <span className="text-yellow-400 text-xl md:text-2xl font-semibold">
                ({draftState.nominatedPlayer.team} -{" "}
                {draftState.nominatedPlayer.position})
              </span>
            </div>
          ) : (
            <div className="text-yellow-200 italic">
              No player nominated yet.
            </div>
          )}
        </div>
        {/* Current Highest Bid */}
        <div className="flex-1 text-right">
          <div className="text-2xl font-semibold text-emerald-300 mb-1">
            Current Highest Bid
          </div>
          {draftState?.currentBid ? (
            <div className="text-4xl md:text-5xl font-extrabold text-yellow-100 drop-shadow-lg">
              ${draftState.currentBid.amount}
              <span className="ml-3 text-yellow-400 text-xl md:text-2xl font-semibold">
                by {highestBidTeamName}
              </span>
            </div>
          ) : (
            <div className="text-yellow-200 italic">No bids yet.</div>
          )}
        </div>
      </div>
      {/* Bidding Interface */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-gray-900/80 border-gray-700 text-emerald-100"
            onClick={() => setBidAmount((prev) => Math.max(minBid, prev - 1))}
            disabled={bidAmount <= minBid}
          >
            <Minus className="w-4 h-4 text-emerald-100" />
          </Button>
          <Button
            className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md text-yellow-100 font-bold px-8 py-3 text-lg"
            disabled
          >
            Bid ${bidAmount}
          </Button>
          <Button
            size="sm"
            className="bg-gray-900/80 border-gray-700 text-emerald-100"
            onClick={() => setBidAmount((prev) => prev + 1)}
          >
            <Plus className="w-4 h-4 text-emerald-100" />
          </Button>
        </div>
      </div>
      {/* Bid History */}
      <div className="mb-6">
        <div className="text-base font-semibold text-emerald-300 mb-2">
          Bid History
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-700/80 rounded-lg p-2 md:p-3">
          {mockBidHistory.length === 0 ? (
            <div className="text-yellow-300 italic text-sm">No bids yet.</div>
          ) : (
            <ul className="divide-y divide-yellow-800">
              {mockBidHistory.map((bid, idx) => {
                // Format timestamp to only show time (HH:mm:ss)
                let timeOnly = bid.timestamp;
                try {
                  const dateObj = new Date(bid.timestamp);
                  timeOnly = dateObj.toLocaleTimeString([], { hour12: false });
                } catch {}
                return (
                  <li
                    key={idx}
                    className="py-0.5 flex justify-between text-yellow-100 text-xs md:text-sm"
                  >
                    <span>
                      <span className="font-mono font-bold">${bid.amount}</span>{" "}
                      by <span className="font-semibold">{bid.teamName}</span>
                    </span>
                    <span className="text-yellow-400 font-mono">
                      {timeOnly}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {/* Trigger Auction Countdown Button */}
      <div className="flex justify-center">
        <Button
          className="bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md font-bold px-8 py-3 text-lg"
          disabled
        >
          Trigger Auction Countdown
        </Button>
      </div>
    </div>
  );
}
