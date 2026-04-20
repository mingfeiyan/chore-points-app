"use client";

import { useEffect, useRef, useState } from "react";

interface ConfettiProps {
  trigger: number;
}

interface Particle {
  id: number;
  x: number;
  dx: string;
  dy: string;
  rot: string;
  size: number;
  color: string;
}

const COLORS = ["#ffb977", "#ff9dbf", "#6cc4cf", "#38c07f", "#fff3b0", "#fff"];

export default function Confetti({ trigger }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (trigger <= 0) return;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      counterRef.current += 1;
      newParticles.push({
        id: counterRef.current,
        x: Math.random() * 100 - 50,
        dx: `${(Math.random() - 0.5) * 120}px`,
        dy: `${-(Math.random() * 80 + 40)}px`,
        rot: `${(Math.random() - 0.5) * 720}deg`,
        size: Math.random() * 8 + 6,
        color: COLORS[i % COLORS.length],
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    const timeout = setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((np) => np.id === p.id))
      );
    }, 1400);

    return () => clearTimeout(timeout);
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `calc(50% + ${p.x}px)`,
            top: "50%",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: "confettiFall 1.4s ease-out forwards",
            ["--dx" as string]: p.dx,
            ["--dy" as string]: p.dy,
            ["--rot" as string]: p.rot,
          }}
        />
      ))}
    </div>
  );
}
