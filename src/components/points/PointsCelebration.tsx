"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import confetti from "canvas-confetti";
import Coin from "@/components/v2/Coin";
import CoinSmall from "@/components/v2/CoinSmall";

type PointsCelebrationProps = {
  fromPoints: number;
  toPoints: number;
  onComplete: () => void;
};

// Coin Arcade palette: gold, coral, mint, pink, sky
const CONFETTI_COLORS = ["#FFCB3B", "#f66951", "#38c07f", "#ff9dbf", "#6fa8ff"];

export default function PointsCelebration({
  fromPoints,
  toPoints,
  onComplete,
}: PointsCelebrationProps) {
  const [displayPoints, setDisplayPoints] = useState(fromPoints);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);

  const playSound = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/celebration.mp3");
      audioRef.current.volume = 0.5;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Autoplay blocked - will play on interaction
    });
  }, []);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
    });
  }, []);

  const startCelebration = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    playSound();
    fireConfetti();

    const pointDiff = toPoints - fromPoints;
    const duration = Math.min(2000, Math.max(500, pointDiff * 100));
    const steps = pointDiff;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setDisplayPoints(fromPoints + currentStep);

      if (currentStep % Math.max(1, Math.floor(steps / 5)) === 0) {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
          colors: CONFETTI_COLORS,
        });
      }

      if (currentStep >= steps) {
        clearInterval(interval);
        fireConfetti();
        setTimeout(onComplete, 800);
      }
    }, stepDuration);
  }, [fromPoints, toPoints, fireConfetti, playSound, onComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startCelebration();
    }, 100);

    return () => clearTimeout(timer);
  }, [startCelebration]);

  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playSound();
    }
  }, [hasInteracted, playSound]);

  const pointsGained = toPoints - fromPoints;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      style={{
        background: "radial-gradient(ellipse at center, #2f62f5 0%, #1a3fb3 100%)",
      }}
    >
      {/* Halo glow behind coin */}
      <div
        className="absolute w-56 h-56 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--ca-gold-glow) 0%, transparent 70%)",
          animation: "haloPulse 1.6s ease-in-out infinite",
        }}
      />

      {/* Spinning coin */}
      <div className="relative">
        <Coin size={140} spin />
      </div>

      {/* Points counter */}
      <div
        className="mt-6 text-7xl sm:text-8xl font-extrabold text-white"
        style={{
          fontFamily: "var(--font-baloo-2), sans-serif",
          textShadow: "0 4px 20px rgba(0,0,0,0.35)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-3px",
        }}
      >
        &times;{displayPoints}
      </div>

      {/* +N gems pill */}
      <div
        className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full"
        style={{
          background: "linear-gradient(180deg, var(--ca-gold) 0%, #e5ad0a 100%)",
          color: "var(--ca-ink)",
          boxShadow: "0 4px 0 var(--ca-gold-deep), 0 8px 20px rgba(0,0,0,0.25)",
          fontFamily: "var(--font-baloo-2), sans-serif",
          animation: "gemmyBounce 0.9s ease-in-out infinite",
        }}
      >
        <CoinSmall size={22} />
        <span className="text-2xl font-extrabold">+{pointsGained} gems!</span>
      </div>

      {/* Encouragement */}
      <p
        className="mt-5 text-lg text-white/85"
        style={{ fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 }}
      >
        Amazing! Keep it up!
      </p>

      {!hasInteracted && (
        <p
          className="mt-4 text-sm text-white/60 animate-pulse"
          style={{ fontFamily: "var(--font-nunito), sans-serif" }}
        >
          Tap for sound
        </p>
      )}
    </div>
  );
}
