import React, { useState, useEffect } from "react";

interface CountdownProps {
  auctionPhase: "idle" | "goingOnce" | "goingTwice" | "sold";
  timerDuration?: number;
}

const phaseText: Record<string, string> = {
  goingOnce: "Going once...",
  goingTwice: "Going twice...",
  sold: "Sold!",
};

const phaseColors: Record<string, string> = {
  goingOnce: "bg-yellow-900/90 border-yellow-400 text-yellow-200",
  goingTwice: "bg-orange-900/90 border-orange-400 text-orange-200",
  sold: "bg-red-900/90 border-red-400 text-red-200",
};

export default function Countdown({
  auctionPhase,
  timerDuration = 4,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (auctionPhase === "goingOnce") {
      setTimeLeft(timerDuration);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (auctionPhase === "goingTwice") {
      setTimeLeft(timerDuration);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [auctionPhase, timerDuration]);

  if (auctionPhase === "idle") return null;

  return (
    <div
      className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 flex justify-center items-center"
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`border-4 rounded-2xl px-12 py-8 shadow-2xl text-4xl font-extrabold animate-pulse select-none ${phaseColors[auctionPhase]}`}
      >
        <div className="text-center">
          <div>{phaseText[auctionPhase] || ""}</div>
          {timeLeft !== null && auctionPhase !== "sold" && (
            <div className="text-2xl mt-2 font-mono">{timeLeft}s</div>
          )}
        </div>
      </div>
    </div>
  );
}
