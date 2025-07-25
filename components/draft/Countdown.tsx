import React from "react";

interface CountdownProps {
  auctionPhase: "idle" | "goingOnce" | "goingTwice" | "sold";
}

const phaseText: Record<string, string> = {
  goingOnce: "Going once...",
  goingTwice: "Going twice...",
  sold: "Sold!",
};

export default function Countdown({ auctionPhase }: CountdownProps) {
  if (auctionPhase === "idle") return null;

  return (
    <div
      className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 flex justify-center items-center"
      style={{ pointerEvents: "none" }}
    >
      <div className="bg-yellow-900/90 border-4 border-yellow-400 rounded-2xl px-12 py-8 shadow-2xl text-4xl font-extrabold text-yellow-200 animate-pulse select-none">
        {phaseText[auctionPhase] || ""}
      </div>
    </div>
  );
}
