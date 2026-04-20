"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Gemmy from "@/components/v2/Gemmy";

interface MathSpeedRoundProps {
  onCorrect: () => void;
  onWrong: () => void;
  onTimeUp: () => void;
}

function generateEquation() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

export default function MathSpeedRound({ onCorrect, onWrong, onTimeUp }: MathSpeedRoundProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [equation, setEquation] = useState(generateEquation);
  const [typed, setTyped] = useState("");
  const [shaking, setShaking] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  // SVG timer ring calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / 30;
  const dashOffset = circumference * (1 - progress);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "backspace") {
        setTyped((prev) => prev.slice(0, -1));
      } else if (key === "submit") {
        if (parseInt(typed) === equation.answer) {
          onCorrect();
          setEquation(generateEquation());
          setTyped("");
        } else {
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
          onWrong();
          setTyped("");
        }
      } else {
        setTyped((prev) => {
          if (prev.length < 3) return prev + key;
          return prev;
        });
      }
    },
    [typed, equation.answer, onCorrect, onWrong]
  );

  const answerStr = String(equation.answer);
  const maxLen = Math.max(answerStr.length, 2);

  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["backspace", "0", "submit"],
  ];

  return (
    <div className="flex-1 bg-ca-cream flex flex-col items-center px-4 py-4 gap-4 relative">
      {/* Timer ring (top-left) */}
      <div className="absolute top-4 left-4">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
          />
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke={timeLeft <= 10 ? "#f66951" : "#2f62f5"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 26 26)"
            className="transition-all duration-1000 ease-linear"
          />
          <text
            x="26"
            y="26"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-bold fill-ca-ink"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif", fontSize: "12px" }}
          >
            {timeLeft}
          </text>
        </svg>
      </div>

      {/* Gemmy top-right */}
      <div className="absolute top-4 right-4">
        <Gemmy size={60} mood="wink" />
      </div>

      {/* Equation card */}
      <div className={`bg-white rounded-2xl p-5 w-full max-w-sm shadow-sm bg-ca-tile-butter/30 mt-14 ${shaking ? "animate-shake" : ""}`}>
        <div
          className="text-5xl font-black text-ca-ink text-center"
          style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
        >
          {equation.a} + {equation.b} =
        </div>

        {/* Answer slots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {Array.from({ length: maxLen }, (_, i) => {
            const digit = typed[i];
            return (
              <div
                key={i}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center ${
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
                  className="text-2xl font-black text-ca-ink"
                  style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
                >
                  {digit || ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact 3x4 keypad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mt-1">
        {keys.flat().map((key) => {
          const isBackspace = key === "backspace";
          const isSubmit = key === "submit";

          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`min-h-[46px] rounded-xl border text-lg font-bold flex items-center justify-center active:scale-95 transition-transform ${
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
