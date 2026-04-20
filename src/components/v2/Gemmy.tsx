"use client";

import { useId } from "react";

type Mood = "happy" | "think" | "cheer" | "celebrate" | "oops" | "sleep" | "wink";

interface GemmyProps {
  size?: number;
  mood?: Mood;
  bounce?: boolean;
  className?: string;
}

export default function Gemmy({ size = 120, mood = "happy", bounce = false, className = "" }: GemmyProps) {
  const id = useId();
  const bodyGradId = `gemmy-body-${id}`;
  const rimGradId = `gemmy-rim-${id}`;

  // Generate notch marks around the coin edge
  const notches = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const rad = (angle * Math.PI) / 180;
    const x1 = 60 + Math.cos(rad) * 48;
    const y1 = 60 + Math.sin(rad) * 48;
    const x2 = 60 + Math.cos(rad) * 52;
    const y2 = 60 + Math.sin(rad) * 52;
    return { x1, y1, x2, y2, key: i };
  });

  // 10-point star for celebrate eyes
  const starPoints = (cx: number, cy: number, outerR: number, innerR: number): string => {
    const points: string[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * 36 - 90) * (Math.PI / 180);
      const r = i % 2 === 0 ? outerR : innerR;
      points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
    }
    return points.join(" ");
  };

  const renderEyes = () => {
    switch (mood) {
      case "happy":
      case "think":
        return (
          <>
            {/* Left eye */}
            <ellipse cx="45" cy="55" rx="4" ry="5" fill="#3D2200" />
            <circle cx="44" cy="53" r="1.5" fill="white" />
            {/* Right eye */}
            <ellipse cx="75" cy="55" rx="4" ry="5" fill="#3D2200" />
            <circle cx="74" cy="53" r="1.5" fill="white" />
            {mood === "think" && (
              <>
                {/* Raised brows */}
                <path d="M40 47 Q45 44 50 47" stroke="#3D2200" strokeWidth="1.5" fill="none" />
                <path d="M70 47 Q75 44 80 47" stroke="#3D2200" strokeWidth="1.5" fill="none" />
              </>
            )}
          </>
        );
      case "cheer":
        return (
          <>
            {/* Squished eyes (happy arcs) */}
            <path d="M40 55 Q45 50 50 55" stroke="#3D2200" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M70 55 Q75 50 80 55" stroke="#3D2200" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "celebrate":
        return (
          <>
            {/* Star eyes */}
            <polygon points={starPoints(45, 55, 6, 3)} fill="#3D2200" />
            <polygon points={starPoints(75, 55, 6, 3)} fill="#3D2200" />
          </>
        );
      case "oops":
        return (
          <>
            {/* Worried eyes (small circles) */}
            <circle cx="45" cy="55" r="3.5" fill="#3D2200" />
            <circle cx="75" cy="55" r="3.5" fill="#3D2200" />
            {/* Down brows */}
            <path d="M38 48 Q43 50 48 48" stroke="#3D2200" strokeWidth="1.5" fill="none" />
            <path d="M72 48 Q77 50 82 48" stroke="#3D2200" strokeWidth="1.5" fill="none" />
          </>
        );
      case "sleep":
        return (
          <>
            {/* Closed eyes (downward arcs) */}
            <path d="M40 55 Q45 59 50 55" stroke="#3D2200" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M70 55 Q75 59 80 55" stroke="#3D2200" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case "wink":
        return (
          <>
            {/* Left eye normal */}
            <ellipse cx="45" cy="55" rx="4" ry="5" fill="#3D2200" />
            <circle cx="44" cy="53" r="1.5" fill="white" />
            {/* Right eye squished (wink) */}
            <path d="M70 55 Q75 50 80 55" stroke="#3D2200" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
    }
  };

  const renderMouth = () => {
    switch (mood) {
      case "happy":
      case "sleep":
      case "wink":
        // Smile
        return <path d="M50 72 Q60 80 70 72" stroke="#3D2200" strokeWidth="2" fill="none" strokeLinecap="round" />;
      case "think":
      case "oops":
        // Mouth-o (small ellipse)
        return <ellipse cx="60" cy="74" rx="4" ry="5" fill="#3D2200" />;
      case "cheer":
      case "celebrate":
        // Open-big mouth
        return (
          <ellipse cx="60" cy="74" rx="8" ry="7" fill="#3D2200">
          </ellipse>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={bounce ? { animation: "gemmyBounce 1.4s ease-in-out infinite" } : undefined}
    >
      <defs>
        <radialGradient id={bodyGradId} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFE88A" />
          <stop offset="55%" stopColor="#FFCB3B" />
          <stop offset="100%" stopColor="#B27B00" />
        </radialGradient>
        <linearGradient id={rimGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFE27A" />
          <stop offset="50%" stopColor="#D9A019" />
          <stop offset="100%" stopColor="#8A5C00" />
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="60" cy="112" rx="28" ry="5" fill="rgba(0,0,0,0.12)" />

      {/* Outer rim */}
      <circle cx="60" cy="58" r="52" fill={`url(#${rimGradId})`} />

      {/* Notch marks */}
      {notches.map((n) => (
        <line
          key={n.key}
          x1={n.x1}
          y1={n.y1 - 2}
          x2={n.x2}
          y2={n.y2 - 2}
          stroke="#8A5C00"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Inner body */}
      <circle cx="60" cy="58" r="44" fill={`url(#${bodyGradId})`} />

      {/* Inner bevel */}
      <circle cx="60" cy="58" r="40" fill="none" stroke="#FFE88A" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="58" r="37" fill="none" stroke="#D9A019" strokeWidth="0.5" opacity="0.3" />

      {/* Pink cheeks */}
      <ellipse cx="36" cy="68" rx="6" ry="4" fill="#FFB0C4" opacity="0.4" />
      <ellipse cx="84" cy="68" rx="6" ry="4" fill="#FFB0C4" opacity="0.4" />

      {/* Face */}
      {renderEyes()}
      {renderMouth()}

      {/* Sparkle highlights */}
      <circle cx="40" cy="35" r="2.5" fill="white" opacity="0.7" />
      <circle cx="35" cy="40" r="1.5" fill="white" opacity="0.5" />
      <g transform="translate(82, 32)" opacity="0.6">
        <line x1="0" y1="-3" x2="0" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-3" y1="0" x2="3" y2="0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
