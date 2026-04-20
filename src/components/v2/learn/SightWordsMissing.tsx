"use client";

import { useMemo, useState } from "react";
import Gemmy from "@/components/v2/Gemmy";

type SightWord = { id: string; word: string; imageUrl: string | null };

interface SightWordsMissingProps {
  word: SightWord;
  onCorrect: () => void;
  onWrong: () => void;
}

function getRandomLetters(exclude: string, count: number): string[] {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const available = alphabet.split("").filter((l) => l !== exclude.toLowerCase());
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function SightWordsMissing({ word, onCorrect, onWrong }: SightWordsMissingProps) {
  const [shaking, setShaking] = useState(false);
  const [showOops, setShowOops] = useState(false);
  const [answered, setAnswered] = useState(false);

  const { hiddenIndex, letters } = useMemo(() => {
    const w = word.word.toLowerCase();
    // Pick a random index (not the first letter)
    const validIndices = Array.from({ length: w.length - 1 }, (_, i) => i + 1);
    const idx = validIndices[Math.floor(Math.random() * validIndices.length)];
    const correctLetter = w[idx];

    // Generate 5 wrong letters + correct, then shuffle
    const wrongLetters = getRandomLetters(correctLetter, 5);
    const allLetters = [correctLetter, ...wrongLetters].sort(() => Math.random() - 0.5);

    return { hiddenIndex: idx, letters: allLetters };
  }, [word.word]);

  const handleLetterTap = (letter: string) => {
    if (answered) return;

    const correctLetter = word.word.toLowerCase()[hiddenIndex];

    if (letter === correctLetter) {
      setAnswered(true);
      onCorrect();
    } else {
      setShaking(true);
      setShowOops(true);
      setTimeout(() => {
        setShaking(false);
        setShowOops(false);
      }, 600);
      onWrong();
    }
  };

  const wordChars = word.word.toLowerCase().split("");

  return (
    <div className="flex-1 bg-ca-cream flex flex-col items-center px-6 py-6 gap-5 relative">
      {/* Gemmy top-right */}
      <div className="absolute top-4 right-4">
        <Gemmy size={60} mood={showOops ? "oops" : "think"} />
      </div>

      {/* Image tile */}
      <div className="w-28 h-28 rounded-2xl bg-ca-tile-teal flex items-center justify-center overflow-hidden shadow-sm mt-2">
        {word.imageUrl ? (
          <img
            src={word.imageUrl}
            alt={word.word}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <span
            className="text-5xl font-black text-ca-teal"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
          >
            {word.word.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Letter slots */}
      <div className="flex items-center gap-1.5 mt-4">
        {wordChars.map((char, i) => {
          if (i === hiddenIndex) {
            return (
              <div
                key={i}
                className={`w-11 h-14 rounded-lg border-2 border-dashed border-ca-gold flex items-center justify-center ${shaking ? "animate-shake" : ""}`}
                style={{
                  animation: shaking
                    ? undefined
                    : "targetPulse 1.5s ease-in-out infinite",
                }}
              >
                <span className="text-2xl font-black text-ca-gold">?</span>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="w-11 h-14 rounded-lg bg-white border border-ca-divider flex items-center justify-center"
            >
              <span
                className="text-2xl font-black text-ca-ink"
                style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
              >
                {char}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3x2 letter key grid */}
      <div className="grid grid-cols-3 gap-3 mt-6 w-full max-w-xs">
        {letters.map((letter, i) => (
          <button
            key={i}
            onClick={() => handleLetterTap(letter)}
            disabled={answered}
            className="min-w-[52px] min-h-[52px] rounded-xl bg-ca-paper border border-ca-divider text-lg font-bold text-ca-ink flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
