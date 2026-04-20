"use client";

import Gemmy from "@/components/v2/Gemmy";

type SightWord = { id: string; word: string; imageUrl: string | null };

interface LearnPreviewProps {
  word: SightWord;
  onReady: () => void;
}

export default function LearnPreview({ word, onReady }: LearnPreviewProps) {
  const handleSpeak = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex-1 bg-ca-cream flex flex-col items-center justify-center px-6 py-8 gap-6">
      {/* Gemmy */}
      <Gemmy size={100} mood="happy" bounce />

      {/* Speech bubble */}
      <div className="bg-white rounded-2xl px-5 py-3 shadow-sm relative">
        <p className="text-ca-ink text-base font-semibold text-center">
          Look &mdash; this is...
        </p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
      </div>

      {/* Image / Letter tile */}
      <div className="w-40 h-40 rounded-2xl bg-ca-tile-peach flex items-center justify-center overflow-hidden shadow-sm">
        {word.imageUrl ? (
          <img
            src={word.imageUrl}
            alt={word.word}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <span
            className="text-7xl font-black text-ca-cobalt"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
          >
            {word.word.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Word */}
      <h2
        className="text-5xl font-black text-ca-ink"
        style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
      >
        {word.word}
      </h2>

      {/* Audio button */}
      <button
        onClick={handleSpeak}
        className="w-14 h-14 rounded-full bg-ca-cobalt flex items-center justify-center shadow-md active:scale-95 transition-transform"
        aria-label={`Listen to ${word.word}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            fill="white"
          />
          <path
            d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* CTA */}
      <button
        onClick={onReady}
        className="w-full max-w-xs py-4 bg-ca-cobalt text-white text-lg font-extrabold rounded-full shadow-[0_4px_0_theme(colors.ca-cobalt-deep)] active:translate-y-0.5 active:shadow-[0_2px_0_theme(colors.ca-cobalt-deep)] transition-all"
        style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
      >
        I got it!
      </button>
    </div>
  );
}
