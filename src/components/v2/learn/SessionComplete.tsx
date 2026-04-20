"use client";

import Gemmy from "@/components/v2/Gemmy";
import CoinSmall from "@/components/v2/CoinSmall";

interface SessionCompleteProps {
  kidName: string;
  coins: number;
  bestCombo: number;
  correctCount: number;
  total: number;
  onHome: () => void;
  onPlayAgain: () => void;
}

export default function SessionComplete({
  kidName,
  coins,
  bestCombo,
  correctCount,
  total,
  onHome,
  onPlayAgain,
}: SessionCompleteProps) {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Cobalt header section */}
      <div className="bg-gradient-to-b from-ca-cobalt to-ca-cobalt-deep px-6 pt-10 pb-16 text-center text-white">
        <p className="text-sm font-semibold opacity-80">Session complete</p>
        <h1
          className="text-2xl font-black mt-1"
          style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
        >
          You did it, {kidName}!
        </h1>
      </div>

      {/* Gemmy overlapping seam */}
      <div className="flex justify-center -mt-12 relative z-10">
        <Gemmy size={120} mood="celebrate" bounce />
      </div>

      {/* White card */}
      <div className="flex-1 bg-white mx-4 -mt-4 rounded-2xl p-5 shadow-sm">
        {/* Personal best banner */}
        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-full px-4 py-1.5 text-center mb-5">
          <span
            className="text-sm font-extrabold text-amber-700"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
          >
            NEW PERSONAL BEST!
          </span>
        </div>

        {/* 3-column stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-ca-tile-mint rounded-2xl p-3 flex flex-col items-center">
            <div className="flex items-center gap-1">
              <CoinSmall size={16} />
              <span
                className="text-2xl font-black text-ca-ink"
                style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
              >
                {coins}
              </span>
            </div>
            <span className="text-xs text-ca-muted font-semibold mt-1">gems</span>
          </div>

          <div className="bg-ca-tile-peach rounded-2xl p-3 flex flex-col items-center">
            <span
              className="text-2xl font-black text-ca-ink"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
            >
              {bestCombo}
            </span>
            <span className="text-xs text-ca-muted font-semibold mt-1">best combo</span>
          </div>

          <div className="bg-ca-tile-teal rounded-2xl p-3 flex flex-col items-center">
            <span
              className="text-2xl font-black text-ca-ink"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
            >
              {correctCount}/{total}
            </span>
            <span className="text-xs text-ca-muted font-semibold mt-1">correct</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onHome}
            className="flex-1 py-3.5 bg-white border-2 border-ca-cobalt text-ca-cobalt font-extrabold rounded-full text-center active:scale-95 transition-transform"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
          >
            Home
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-[2] py-3.5 bg-ca-cobalt text-white font-extrabold rounded-full text-center shadow-[0_4px_0_theme(colors.ca-cobalt-deep)] active:translate-y-0.5 active:shadow-[0_2px_0_theme(colors.ca-cobalt-deep)] transition-all"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
          >
            Play again
          </button>
        </div>
      </div>

      {/* Bottom spacer for card to sit above */}
      <div className="h-6 bg-ca-cream" />
    </div>
  );
}
