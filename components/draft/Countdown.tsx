import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownProps {
  auctionPhase: "idle" | "goingOnce" | "goingTwice" | "sold";
  timerDuration?: number;
}

const phaseText: Record<string, string> = {
  goingOnce: "GOING ONCE...",
  goingTwice: "GOING TWICE...",
  sold: "SOLD!",
};

const phaseColors: Record<string, string> = {
  goingOnce:
    "bg-gradient-to-r from-yellow-600 to-orange-600 border-yellow-300 text-yellow-100",
  goingTwice:
    "bg-gradient-to-r from-orange-600 to-red-600 border-orange-300 text-orange-100",
  sold: "bg-gradient-to-r from-red-600 to-pink-600 border-red-300 text-red-100",
};

const phaseAnimations = {
  goingOnce: {
    scale: [1, 1.1, 1],
    rotate: [0, -2, 2, -1, 0],
  },
  goingTwice: {
    scale: [1, 1.15, 1],
    rotate: [0, -3, 3, -2, 0],
  },
  sold: {
    scale: [1, 1.2, 1],
    rotate: [0, -5, 5, -3, 0],
  },
};

export default function Countdown({
  auctionPhase,
  timerDuration = 4, // Fixed 4 seconds for auction countdown
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

  return (
    <AnimatePresence mode="wait">
      {auctionPhase !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            ...phaseAnimations[auctionPhase as keyof typeof phaseAnimations],
          }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            scale: {
              duration: 0.6,
              ease: "easeInOut",
              repeat: auctionPhase === "sold" ? 0 : Infinity,
              repeatType: "reverse",
            },
            rotate: {
              duration: 0.8,
              ease: "easeInOut",
              repeat: auctionPhase === "sold" ? 0 : Infinity,
              repeatType: "reverse",
            },
          }}
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 flex justify-center items-center"
          style={{ pointerEvents: "none" }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 blur-2xl opacity-50">
            <div
              className={`w-full h-full rounded-3xl ${phaseColors[auctionPhase].split(" ")[0]} ${phaseColors[auctionPhase].split(" ")[1]}`}
            />
          </div>

          {/* Main countdown box */}
          <motion.div
            className={`relative border-4 rounded-3xl px-16 py-10 shadow-2xl text-5xl font-black tracking-wider select-none ${phaseColors[auctionPhase]} backdrop-blur-sm`}
            style={{
              boxShadow: `0 0 40px ${auctionPhase === "goingOnce" ? "#fbbf24" : auctionPhase === "goingTwice" ? "#fb923c" : "#ef4444"}40`,
            }}
          >
            {/* Animated border */}
            <motion.div
              className="absolute inset-0 rounded-3xl border-4 border-white/30"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <div className="text-center relative z-10">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: auctionPhase === "sold" ? 3 : Infinity,
                  repeatType: "reverse",
                }}
                className="drop-shadow-lg"
              >
                {phaseText[auctionPhase] || ""}
              </motion.div>

              {/* Timer display */}
              {timeLeft !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold mt-2 text-white/90"
                >
                  {timeLeft}s
                </motion.div>
              )}
            </div>

            {/* Particle effects for sold */}
            {auctionPhase === "sold" && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: 0,
                    }}
                    animate={{
                      x: Math.cos((i * 45 * Math.PI) / 180) * 100,
                      y: Math.sin((i * 45 * Math.PI) / 180) * 100,
                      opacity: 0,
                      scale: 1,
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
