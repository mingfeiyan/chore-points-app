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
      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
