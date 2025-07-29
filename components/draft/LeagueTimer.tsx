import React, { useState, useEffect } from "react";

interface LeagueTimerProps {
  bidTimer: number | null;
  bidTimerExpiresAt: number | null;
  auctionPhase: "idle" | "goingOnce" | "goingTwice" | "sold";
}

export default function LeagueTimer({
  bidTimer,
  bidTimerExpiresAt,
  auctionPhase,
}: LeagueTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!bidTimerExpiresAt || auctionPhase !== "idle") {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((bidTimerExpiresAt - now) / 1000)
      );
      setTimeLeft(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [bidTimerExpiresAt, auctionPhase]);

  // Don't show timer if no time left or not in idle phase
  if (timeLeft === null || auctionPhase !== "idle") {
    return null;
  }

  // Calculate color based on time remaining
  const getColorClass = () => {
    if (timeLeft <= 10) return "text-red-400 bg-red-900/20 border-red-400";
    if (timeLeft <= 30)
      return "text-yellow-400 bg-yellow-900/20 border-yellow-400";
    return "text-emerald-400 bg-emerald-900/20 border-emerald-400";
  };

  return (
    <div className="flex justify-center mb-3 sm:mb-4">
      <div
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 font-mono text-base sm:text-lg font-bold ${getColorClass()}`}
      >
        Bidding Time: {timeLeft}s
      </div>
    </div>
  );
}
