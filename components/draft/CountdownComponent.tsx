"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CountdownProps {
  countdown: {
    active: boolean;
    endTime: number;
    duration: number;
  };
  onCountdownEnd: () => void;
}

export function CountdownComponent({
  countdown,
  onCountdownEnd,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasVoiceAnnounced, setHasVoiceAnnounced] = useState({
    goingOnce: false,
    goingTwice: false,
    sold: false,
  });
  const [isMuted, setIsMuted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech synthesis
  const speakText = (text: string) => {
    if (isMuted || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!countdown.active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Reset voice announcements
    setHasVoiceAnnounced({
      goingOnce: false,
      goingTwice: false,
      sold: false,
    });

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, countdown.endTime - now);
      setTimeLeft(remaining);

      // Voice announcements
      if (remaining <= 1000 && !hasVoiceAnnounced.sold) {
        speakText("Sold!");
        setHasVoiceAnnounced((prev) => ({ ...prev, sold: true }));
      } else if (remaining <= 3000 && !hasVoiceAnnounced.goingTwice) {
        speakText("Going twice!");
        setHasVoiceAnnounced((prev) => ({ ...prev, goingTwice: true }));
      } else if (remaining <= 6000 && !hasVoiceAnnounced.goingOnce) {
        speakText("Going once!");
        setHasVoiceAnnounced((prev) => ({ ...prev, goingOnce: true }));
      }

      // Countdown ended
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        onCountdownEnd();
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [countdown, hasVoiceAnnounced, isMuted, onCountdownEnd]);

  if (!countdown.active) {
    return null;
  }

  const seconds = Math.ceil(timeLeft / 1000);
  const progress = ((countdown.duration - timeLeft) / countdown.duration) * 100;

  const getCountdownColor = () => {
    if (seconds <= 1) return "bg-red-500";
    if (seconds <= 3) return "bg-orange-500";
    if (seconds <= 6) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getCountdownText = () => {
    if (seconds <= 1) return "SOLD!";
    if (seconds <= 3) return "Going Twice!";
    if (seconds <= 6) return "Going Once!";
    return "Countdown Active";
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-800">
                {getCountdownText()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="h-8 w-8 p-0"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Badge variant="destructive" className="text-lg font-bold px-3">
                {seconds}s
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Started</span>
              <span>Time remaining: {seconds}s</span>
            </div>
          </div>

          {/* Visual Countdown */}
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-white font-bold text-3xl transition-all duration-300 ${getCountdownColor()}`}
              style={{
                animation: seconds <= 3 ? "pulse 0.5s infinite" : "none",
              }}
            >
              {seconds}
            </div>
          </div>

          {/* Status Messages */}
          <div className="text-center space-y-2">
            {seconds > 6 && (
              <p className="text-sm text-muted-foreground">
                Countdown in progress...
              </p>
            )}
            {seconds <= 6 && seconds > 3 && (
              <p className="text-orange-700 font-semibold animate-pulse">
                🔨 Going Once! Last chance to bid!
              </p>
            )}
            {seconds <= 3 && seconds > 1 && (
              <p className="text-red-700 font-bold animate-pulse">
                ⚡ Going Twice! Final warning!
              </p>
            )}
            {seconds <= 1 && (
              <p className="text-red-800 font-bold text-lg animate-bounce">
                🎯 SOLD!
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </Card>
  );
}
