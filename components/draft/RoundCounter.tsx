import React from "react";

interface RoundCounterProps {
  currentRound: number;
  currentPick: number;
  totalPicks: number;
  totalTeams: number;
}

export default function RoundCounter({
  currentRound,
  currentPick,
  totalPicks,
  totalTeams,
}: RoundCounterProps) {
  const totalRounds = Math.ceil((totalTeams * 16) / totalTeams); // Assuming 16 roster spots per team
  const progressPercentage = (totalPicks / (totalTeams * 16)) * 100;

  return (
    <div className="bg-gradient-to-br from-blue-900/80 to-blue-700/80 border-2 border-blue-400 rounded-lg p-4 shadow-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-100 mb-2">
          Round {currentRound} • Pick {currentPick}
        </div>
        <div className="text-sm text-blue-200 mb-3">
          {totalPicks} picks completed • {totalTeams} teams
        </div>

        {/* Progress bar */}
        <div className="w-full bg-blue-800 rounded-full h-2 mb-2">
          <div
            className="bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>

        <div className="text-xs text-blue-300">
          {Math.round(progressPercentage)}% complete
        </div>
      </div>
    </div>
  );
}
