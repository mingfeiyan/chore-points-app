"use client";

import { useEffect, useRef, useState } from "react";
import Coin from "./Coin";
import Confetti from "./Confetti";
import FlameIcon from "./FlameIcon";

interface CoinCounterProps {
  base: number;
  delta: number;
  size?: "hero" | "compact";
}

export default function CoinCounter({ base, delta, size = "hero" }: CoinCounterProps) {
  const [displayCount, setDisplayCount] = useState(base);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incrementRef = useRef(0);

  useEffect(() => {
    if (delta <= 0) {
      setDisplayCount(base + delta);
      return;
    }

    setDisplayCount(base);
    incrementRef.current = 0;

    intervalRef.current = setInterval(() => {
      incrementRef.current += 1;
      const next = base + incrementRef.current;
      setDisplayCount(next);

      // Fire confetti every 4th increment when delta >= 10
      if (delta >= 10 && incrementRef.current % 4 === 0) {
        setConfettiTrigger((prev) => prev + 1);
      }

      if (incrementRef.current >= delta) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 70);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [base, delta]);

  const isHero = size === "hero";
  const coinSize = isHero ? 82 : 42;
  const textClass = isHero ? "text-7xl" : "text-4xl";

  return (
    <div className="relative inline-flex items-center gap-2">
      <Confetti trigger={confettiTrigger} />
      <Coin size={coinSize} spin={delta > 0} />
      <span
        className={`${textClass} font-bold text-white`}
        style={{
          fontFamily: "var(--font-baloo-2), sans-serif",
          textShadow: "0 2px 8px rgba(0,0,0,0.3)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-2px",
        }}
      >
        &times;{displayCount}
      </span>
      {delta >= 10 && (
        <span className="inline-flex items-center gap-1">
          <FlameIcon size={isHero ? 32 : 22} />
          <span
            className={`${isHero ? "text-3xl" : "text-xl"} font-bold text-white`}
            style={{
              fontFamily: "var(--font-baloo-2), sans-serif",
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            +{delta}
          </span>
        </span>
      )}
    </div>
  );
}
