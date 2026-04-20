import { useId } from "react";

interface CoinProps {
  size?: number;
  spin?: boolean;
  className?: string;
}

export default function Coin({ size = 60, spin = false, className = "" }: CoinProps) {
  const id = useId();
  const bodyId = `coin-body-${id}`;
  const liteId = `coin-lite-${id}`;
  const darkId = `coin-dark-${id}`;
  const glowId = `coin-glow-${id}`;

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
        {/* Body gradient */}
        <linearGradient id={bodyId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFF6C9" />
          <stop offset="35%" stopColor="#FFD84D" />
          <stop offset="70%" stopColor="#D99A12" />
          <stop offset="100%" stopColor="#7A4E00" />
        </linearGradient>
        {/* Lite gradient */}
        <linearGradient id={liteId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFDE8" />
          <stop offset="100%" stopColor="#FFD147" />
        </linearGradient>
        {/* Dark gradient */}
        <linearGradient id={darkId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#C98A0D" />
          <stop offset="100%" stopColor="#6A4200" />
        </linearGradient>
        {/* Glow radial */}
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE88A" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFE88A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="70" cy="130" rx="32" ry="6" fill="rgba(0,0,0,0.15)" />

      <g style={spin ? { animation: "gemSpin 2.2s linear infinite", transformOrigin: "70px 68px" } : undefined}>
        {/* Halo / glow circle */}
        <circle cx="70" cy="68" r="48" fill={`url(#${glowId})`} />

        {/* Gem body – brilliant-cut silhouette */}
        {/* Crown (trapezoid top) */}
        <path
          d="M70 20 L100 50 L40 50 Z"
          fill={`url(#${liteId})`}
        />
        {/* Crown side facets */}
        <path
          d="M70 20 L100 50 L110 45 L85 22 Z"
          fill={`url(#${bodyId})`}
          opacity="0.9"
        />
        <path
          d="M70 20 L40 50 L30 45 L55 22 Z"
          fill={`url(#${bodyId})`}
          opacity="0.9"
        />

        {/* Star facet (top crown) */}
        <path
          d="M70 28 L85 48 L55 48 Z"
          fill="#FFFDE8"
          opacity="0.5"
        />

        {/* Girdle line */}
        <line x1="30" y1="50" x2="110" y2="50" stroke="#B27B00" strokeWidth="1.5" />

        {/* Pavilion (triangle bottom) */}
        <path
          d="M30 50 L110 50 L70 110 Z"
          fill={`url(#${bodyId})`}
        />

        {/* Pavilion facets */}
        <path
          d="M70 110 L50 50 L70 55 Z"
          fill={`url(#${darkId})`}
          opacity="0.6"
        />
        <path
          d="M70 110 L90 50 L70 55 Z"
          fill={`url(#${darkId})`}
          opacity="0.4"
        />
        <path
          d="M70 110 L30 50 L50 50 Z"
          fill={`url(#${darkId})`}
          opacity="0.7"
        />
        <path
          d="M70 110 L110 50 L90 50 Z"
          fill={`url(#${darkId})`}
          opacity="0.5"
        />

        {/* Shine highlights */}
        <path
          d="M55 35 L65 45 L58 45 Z"
          fill="white"
          opacity="0.7"
        />
        <circle cx="60" cy="38" r="2" fill="white" opacity="0.9" />

        {/* Sparkle */}
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
