import { useId } from "react";

interface FlameIconProps {
  size?: number;
  className?: string;
}

export default function FlameIcon({ size = 32, className = "" }: FlameIconProps) {
  const id = useId();
  const gradId = `flame-grad-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ animation: "flamePulse 1.2s ease-in-out infinite" }}
    >
      <defs>
        <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="50%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#e55a43" />
        </linearGradient>
      </defs>
      {/* Outer flame */}
      <path
        d="M16 2 C16 2 24 10 24 18 C24 24 20.5 28 16 28 C11.5 28 8 24 8 18 C8 10 16 2 16 2Z"
        fill={`url(#${gradId})`}
      />
      {/* Inner bright core */}
      <path
        d="M16 14 C16 14 20 18 20 22 C20 24.5 18.2 26 16 26 C13.8 26 12 24.5 12 22 C12 18 16 14 16 14Z"
        fill="#fff3b0"
        opacity="0.8"
      />
    </svg>
  );
}
