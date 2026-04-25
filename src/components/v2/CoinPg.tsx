import { useId } from "react";

// Paper Garden tinted variant of Coin — same gem silhouette, green palette.
// Used on Paper Garden surfaces (e.g. the marketing landing) where the gold
// Coin clashes with the cream/green theme. Keep Coin.tsx in sync structurally.

interface CoinPgProps {
  size?: number;
  spin?: boolean;
  className?: string;
}

export default function CoinPg({ size = 60, spin = false, className = "" }: CoinPgProps) {
  const id = useId();
  const bodyId = `coinpg-body-${id}`;
  const liteId = `coinpg-lite-${id}`;
  const darkId = `coinpg-dark-${id}`;
  const glowId = `coinpg-glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={bodyId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#f0f8e0" />
          <stop offset="35%" stopColor="#9bbf7a" />
          <stop offset="70%" stopColor="#4a6a32" />
          <stop offset="100%" stopColor="#2a3e1d" />
        </linearGradient>
        <linearGradient id={liteId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#f6fbe6" />
          <stop offset="100%" stopColor="#9bbf7a" />
        </linearGradient>
        <linearGradient id={darkId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#4a6a32" />
          <stop offset="100%" stopColor="#1f3015" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c8e3a5" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#c8e3a5" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="70" cy="130" rx="32" ry="6" fill="rgba(0,0,0,0.15)" />

      <g style={spin ? { animation: "gemSpin 2.2s linear infinite", transformOrigin: "70px 68px" } : undefined}>
        <circle cx="70" cy="68" r="48" fill={`url(#${glowId})`} />

        <path d="M70 20 L100 50 L40 50 Z" fill={`url(#${liteId})`} />
        <path d="M70 20 L100 50 L110 45 L85 22 Z" fill={`url(#${bodyId})`} opacity="0.9" />
        <path d="M70 20 L40 50 L30 45 L55 22 Z" fill={`url(#${bodyId})`} opacity="0.9" />

        <path d="M70 28 L85 48 L55 48 Z" fill="#f6fbe6" opacity="0.5" />

        <line x1="30" y1="50" x2="110" y2="50" stroke="#2a3e1d" strokeWidth="1.5" />

        <path d="M30 50 L110 50 L70 110 Z" fill={`url(#${bodyId})`} />

        <path d="M70 110 L50 50 L70 55 Z" fill={`url(#${darkId})`} opacity="0.6" />
        <path d="M70 110 L90 50 L70 55 Z" fill={`url(#${darkId})`} opacity="0.4" />
        <path d="M70 110 L30 50 L50 50 Z" fill={`url(#${darkId})`} opacity="0.7" />
        <path d="M70 110 L110 50 L90 50 Z" fill={`url(#${darkId})`} opacity="0.5" />

        <path d="M55 35 L65 45 L58 45 Z" fill="white" opacity="0.7" />
        <circle cx="60" cy="38" r="2" fill="white" opacity="0.9" />

        <g transform="translate(95, 30)" opacity="0.8">
          <line x1="0" y1="-5" x2="0" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-5" y1="0" x2="5" y2="0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="white" strokeWidth="1" strokeLinecap="round" />
          <line x1="3" y1="-3" x2="-3" y2="3" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
