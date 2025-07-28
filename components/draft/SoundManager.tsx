import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface SoundManagerProps {
  auctionPhase: "idle" | "goingOnce" | "goingTwice" | "sold";
  nominatedPlayer: {
    id: string;
    name: string;
    position: string;
    team: string;
  } | null;
  currentBid: {
    amount: number;
    teamId: string;
  } | null;
  teams: Array<{ id: string; name: string }>;
}

export default function SoundManager({
  auctionPhase,
  nominatedPlayer,
  currentBid,
  teams,
}: SoundManagerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const lastPhaseRef = useRef<string>("idle");
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (!speechEnabled || isMuted || !speechSynthesisRef.current) return;

    // Only announce when phase changes
    if (auctionPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = auctionPhase;

      let message = "";

      switch (auctionPhase) {
        case "goingOnce":
          message = "Going once";
          break;
        case "goingTwice":
          message = "Going twice";
          break;
        case "sold":
          message = "Sold";
          break;
        default:
          return;
      }

      // Cancel any ongoing speech
      speechSynthesisRef.current.cancel();

      // Create and speak the message
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      speechSynthesisRef.current.speak(utterance);
    }
  }, [
    auctionPhase,
    nominatedPlayer,
    currentBid,
    teams,
    speechEnabled,
    isMuted,
  ]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
  };

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSpeech}
        className={`p-2 rounded-full ${
          speechEnabled
            ? "bg-green-900/60 text-green-300 border-green-400"
            : "bg-gray-900/60 text-gray-400 border-gray-600"
        } border`}
        title={speechEnabled ? "Disable speech" : "Enable speech"}
      >
        {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </Button>

      {speechEnabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          className={`p-2 rounded-full ${
            !isMuted
              ? "bg-blue-900/60 text-blue-300 border-blue-400"
              : "bg-red-900/60 text-red-300 border-red-400"
          } border`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
      )}
    </div>
  );
}
