import { ReactNode } from "react";

interface KidHeaderBGProps {
  children: ReactNode;
  compact?: boolean;
}

export default function KidHeaderBG({ children, compact }: KidHeaderBGProps) {
  return (
    <div
      style={{
        background:
          "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 70%, #0d2480 100%)",
        padding: compact ? "52px 18px 18px" : "52px 18px 26px",
        borderRadius: "0 0 28px 28px",
        color: "white",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Large circle - top right */}
      <svg
        width="90"
        height="90"
        viewBox="0 0 90 90"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          opacity: 0.15,
          transform: "rotate(15deg)",
        }}
      >
        <circle cx="45" cy="45" r="45" fill="#FFE88A" />
      </svg>

      {/* Medium circle - bottom left */}
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          opacity: 0.12,
        }}
      >
        <circle cx="30" cy="30" r="30" fill="#FFE88A" />
      </svg>

      {/* Small sparkle */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        style={{
          position: "absolute",
          top: 60,
          left: 40,
          opacity: 0.5,
        }}
      >
        <path
          d="M5 0L5.9 3.1L9 3.1L6.5 5L7.4 8.1L5 6.2L2.6 8.1L3.5 5L1 3.1L4.1 3.1Z"
          fill="white"
        />
      </svg>

      {/* Tiny sparkle */}
      <svg
        width="8"
        height="8"
        viewBox="0 0 10 10"
        style={{
          position: "absolute",
          top: 90,
          right: 30,
          opacity: 0.55,
        }}
      >
        <path
          d="M5 0L5.9 3.1L9 3.1L6.5 5L7.4 8.1L5 6.2L2.6 8.1L3.5 5L1 3.1L4.1 3.1Z"
          fill="white"
        />
      </svg>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
