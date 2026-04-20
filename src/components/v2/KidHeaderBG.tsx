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
      {/* Subtle sparkles only */}
      <svg
        width="10" height="10" viewBox="0 0 10 10"
        className="absolute top-[60px] left-10 opacity-40"
      >
        <path d="M5 0L5.9 3.1L9 3.1L6.5 5L7.4 8.1L5 6.2L2.6 8.1L3.5 5L1 3.1L4.1 3.1Z" fill="white" />
      </svg>
      <svg
        width="8" height="8" viewBox="0 0 10 10"
        className="absolute top-[85px] right-8 opacity-35"
      >
        <path d="M5 0L5.9 3.1L9 3.1L6.5 5L7.4 8.1L5 6.2L2.6 8.1L3.5 5L1 3.1L4.1 3.1Z" fill="white" />
      </svg>
      <svg
        width="6" height="6" viewBox="0 0 10 10"
        className="absolute top-16 right-[40%] opacity-30"
      >
        <path d="M5 0L5.9 3.1L9 3.1L6.5 5L7.4 8.1L5 6.2L2.6 8.1L3.5 5L1 3.1L4.1 3.1Z" fill="white" />
      </svg>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
