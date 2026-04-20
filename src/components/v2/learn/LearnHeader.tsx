"use client";

import CoinSmall from "@/components/v2/CoinSmall";
import FlameIcon from "@/components/v2/FlameIcon";

interface LearnHeaderProps {
  subject: string;
  combo: number;
  progress: number;
  coins: number;
  onClose: () => void;
}

export default function LearnHeader({ subject, combo, progress, coins, onClose }: LearnHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-ca-cobalt to-ca-cobalt-deep text-white px-4 py-3 space-y-2">
      {/* Row 1: Close | Subject | Combo */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white font-bold text-lg"
          aria-label="Close session"
        >
          &times;
        </button>

        <span
          className="text-base font-extrabold capitalize"
          style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
        >
          {subject}
        </span>

        {combo > 0 && (
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              combo >= 3
                ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_8px_rgba(255,100,50,0.6)]"
                : "bg-white/20"
            }`}
          >
            <FlameIcon size={14} />
            <span>&times;{combo}</span>
          </div>
        )}

        {combo === 0 && <div className="w-8" />}
      </div>

      {/* Row 2: Progress bar + Coins */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-ca-gold transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-1 text-sm font-bold">
          <CoinSmall size={16} />
          <span>{coins}</span>
        </div>
      </div>
    </div>
  );
}
