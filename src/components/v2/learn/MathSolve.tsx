"use client";

import { useMemo, useState } from "react";
import Gemmy from "@/components/v2/Gemmy";

interface MathSolveProps {
  equation?: { a: number; b: number; op: string; answer: number };
  onCorrect: () => void;
  onWrong: () => void;
}

export default function MathSolve({ onCorrect, onWrong }: MathSolveProps) {
  const { a, b, answer } = useMemo(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, answer: a + b };
  }, []);

  const [typed, setTyped] = useState("");
  const [shaking, setShaking] = useState(false);

  const answerStr = String(answer);
  const maxLen = answerStr.length;

  const handleKey = (key: string) => {
    if (key === "backspace") {
      setTyped((prev) => prev.slice(0, -1));
    } else if (key === "submit") {
      if (parseInt(typed) === answer) {
        onCorrect();
      } else {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        onWrong();
        setTyped("");
      }
    } else {
      if (typed.length < maxLen + 1) {
        setTyped((prev) => prev + key);
      }
    }
  };

  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["backspace", "0", "submit"],
  ];

  return (
    <div className="flex-1 bg-ca-cream flex flex-col items-center px-4 py-6 gap-5 relative">
      {/* Gemmy top-right */}
      <div className="absolute top-4 right-4">
        <Gemmy size={60} mood="think" />
      </div>

      {/* Equation card */}
      <div className={`bg-white rounded-2xl p-6 w-full max-w-sm shadow-sm bg-ca-tile-peach/30 ${shaking ? "animate-shake" : ""}`}>
        {/* Equation */}
        <div
          className="text-6xl font-black text-ca-ink text-center"
          style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
        >
          {a} + {b} =
        </div>

        {/* Answer slots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: Math.max(maxLen, 2) }, (_, i) => {
            const digit = typed[i];
            return (
              <div
                key={i}
                className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center ${
                  digit
                    ? "bg-ca-gold/20 border-ca-gold"
                    : "border-dashed border-ca-gold"
                }`}
                style={
                  !digit
                    ? { animation: "targetPulse 1.5s ease-in-out infinite" }
                    : undefined
                }
              >
                <span
                  className="text-3xl font-black text-ca-ink"
                  style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
                >
                  {digit || ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3x4 keypad */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mt-2">
        {keys.flat().map((key) => {
          const isBackspace = key === "backspace";
          const isSubmit = key === "submit";

          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`min-h-[52px] rounded-xl border text-xl font-bold flex items-center justify-center active:scale-95 transition-transform ${
                isSubmit
                  ? "bg-ca-mint text-white font-extrabold border-ca-mint"
                  : "bg-white border-ca-divider text-ca-ink"
              }`}
              style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
            >
              {isBackspace ? "\u232B" : isSubmit ? "\u2713" : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
