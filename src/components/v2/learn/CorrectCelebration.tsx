"use client";

import { useEffect, useState } from "react";
import Gemmy from "@/components/v2/Gemmy";
import Confetti from "@/components/v2/Confetti";

interface CorrectCelebrationProps {
  combo: number;
  onDismiss: () => void;
}

export default function CorrectCelebration({ combo, onDismiss }: CorrectCelebrationProps) {
  const [confettiTrigger] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Generate 9 spinning coins with staggered delays
  const coins = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    delay: `${i * 0.15}s`,
    duration: `${1.2 + Math.random() * 0.6}s`,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      onClick={onDismiss}
      style={{
        background: "radial-gradient(ellipse at center, #2f62f5 0%, #1a3fb3 100%)",
      }}
    >
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        <Confetti trigger={confettiTrigger} />
      </div>

      {/* Spinning coins */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute pointer-events-none"
          style={{
            left: coin.left,
            top: "-10%",
            animation: `confettiFall ${coin.duration} ease-out ${coin.delay} forwards`,
            ["--dx" as string]: `${(Math.random() - 0.5) * 60}px`,
            ["--dy" as string]: `${300 + Math.random() * 200}px`,
            ["--rot" as string]: `${720 + Math.random() * 360}deg`,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            style={{ animation: `gemSpin 1s linear infinite` }}
          >
            <path
              d="M12 3 L19 9 L12 21 L5 9 Z"
              fill="#FFCB3B"
              stroke="#7A4E00"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M12 4.5 L16 9 L8 9 Z" fill="#FFFDE8" opacity="0.7" />
          </svg>
        </div>
      ))}

      {/* Golden halo behind Gemmy */}
      <div
        className="absolute w-36 h-36 rounded-full bg-ca-gold-glow/50"
        style={{ animation: "haloPulse 1.5s ease-in-out infinite" }}
      />

      {/* Gemmy */}
      <Gemmy size={120} mood="celebrate" bounce />

      {/* NICE! text */}
      <h1
        className="text-4xl font-black mt-4 bg-gradient-to-b from-yellow-300 to-amber-500 bg-clip-text text-transparent"
        style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
      >
        NICE!
      </h1>

      {/* Reward chips */}
      <div className="flex items-center gap-3 mt-4">
        <div className="bg-white rounded-full px-4 py-1.5 flex items-center gap-1.5 text-sm font-bold text-ca-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L19 9 L12 21 L5 9 Z" fill="#FFCB3B" stroke="#7A4E00" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          +1 gem
        </div>
        {combo >= 1 && (
          <div
            className={`rounded-full px-4 py-1.5 text-sm font-bold text-white ${
              combo >= 3 ? "bg-red-500" : "bg-white/20"
            }`}
          >
            &times;{combo} combo
          </div>
        )}
      </div>
    </div>
  );
}
