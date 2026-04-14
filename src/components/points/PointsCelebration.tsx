"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import confetti from "canvas-confetti";

type PointsCelebrationProps = {
  fromPoints: number;
  toPoints: number;
  onComplete: () => void;
};

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
      colors: ["#FFD700", "#FFA500", "#FF6347", "#00CED1", "#9370DB"],
    });
  }, []);

  const startCelebration = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Play sound
    playSound();

    // Fire initial confetti burst
    fireConfetti();

    // Calculate animation parameters
    const pointDiff = toPoints - fromPoints;
    const duration = Math.min(2000, Math.max(500, pointDiff * 100));
    const steps = pointDiff;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setDisplayPoints(fromPoints + currentStep);

      // Fire small confetti bursts during counting
      if (currentStep % Math.max(1, Math.floor(steps / 5)) === 0) {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FFA500"],
        });
      }

      if (currentStep >= steps) {
        clearInterval(interval);
        // Fire final big confetti burst
        fireConfetti();
        // Notify parent after a brief delay
        setTimeout(onComplete, 800);
      }
    }, stepDuration);
  }, [fromPoints, toPoints, fireConfetti, playSound, onComplete]);

  // Try to autoplay on mount
  useEffect(() => {
    // Small delay to let the component render first
    const timer = setTimeout(() => {
      startCelebration();
    }, 100);

    return () => clearTimeout(timer);
  }, [startCelebration]);

  // Handle user interaction to enable sound
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playSound();
    }
  }, [hasInteracted, playSound]);

  const pointsGained = toPoints - fromPoints;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <div className="text-center">
        <div className="animate-bounce">
          <div className="text-8xl sm:text-9xl font-bold text-white drop-shadow-lg font-mono">
            {displayPoints}
          </div>
        </div>
        <div className="text-3xl sm:text-4xl text-yellow-400 font-bold mt-6 animate-pulse">
          +{pointsGained} Points!
        </div>
        <div className="text-xl text-white/80 mt-4">
          Great job! Keep it up!
        </div>
        {!hasInteracted && (
          <div className="text-sm text-white/60 mt-6 animate-pulse">
            Tap for sound
          </div>
        )}
      </div>
    </div>
  );
}
