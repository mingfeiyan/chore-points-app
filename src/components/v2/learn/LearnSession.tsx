"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import LearnHeader from "./LearnHeader";
import LearnPreview from "./LearnPreview";
import SightWordsMissing from "./SightWordsMissing";
import CorrectCelebration from "./CorrectCelebration";
import MathSolve from "./MathSolve";
import MathSpeedRound from "./MathSpeedRound";
import SessionComplete from "./SessionComplete";

// --- Types ---

type SightWord = { id: string; word: string; imageUrl: string | null };

type SessionStep =
  | "loading"
  | "preview"
  | "quiz"
  | "celebration"
  | "math"
  | "speed"
  | "complete";

type SessionState = {
  subject: "sight-words" | "math";
  step: SessionStep;
  wordIndex: number;
  words: SightWord[];
  total: number;
  correctCount: number;
  combo: number;
  bestCombo: number;
  coins: number;
  showCelebration: boolean;
};

type SessionAction =
  | { type: "START_SESSION"; words: SightWord[] }
  | { type: "ADVANCE_TO_QUIZ" }
  | { type: "CORRECT_ANSWER" }
  | { type: "WRONG_ANSWER" }
  | { type: "DISMISS_CELEBRATION" }
  | { type: "COMPLETE" };

// --- Reducer ---

const initialState: SessionState = {
  subject: "sight-words",
  step: "loading",
  wordIndex: 0,
  words: [],
  total: 0,
  correctCount: 0,
  combo: 0,
  bestCombo: 0,
  coins: 0,
  showCelebration: false,
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "START_SESSION":
      return {
        ...state,
        words: action.words,
        total: action.words.length,
        step: "preview",
        wordIndex: 0,
        correctCount: 0,
        combo: 0,
        bestCombo: 0,
        coins: 0,
        showCelebration: false,
      };

    case "ADVANCE_TO_QUIZ":
      return {
        ...state,
        step: "quiz",
      };

    case "CORRECT_ANSWER": {
      const newCombo = state.combo + 1;
      const newBestCombo = Math.max(state.bestCombo, newCombo);
      return {
        ...state,
        combo: newCombo,
        bestCombo: newBestCombo,
        coins: state.coins + 1,
        correctCount: state.correctCount + 1,
        showCelebration: true,
      };
    }

    case "WRONG_ANSWER":
      return {
        ...state,
        combo: 0,
      };

    case "DISMISS_CELEBRATION": {
      const nextIndex = state.wordIndex + 1;
      if (nextIndex >= state.total) {
        return {
          ...state,
          showCelebration: false,
          step: "complete",
        };
      }
      return {
        ...state,
        showCelebration: false,
        wordIndex: nextIndex,
        step: "preview",
      };
    }

    case "COMPLETE":
      return {
        ...state,
        step: "complete",
      };

    default:
      return state;
  }
}

// --- Component ---

interface LearnSessionProps {
  kidId?: string;
  kidName?: string;
  onExit: () => void;
}

export default function LearnSession({ kidId, kidName, onExit }: LearnSessionProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const [sessionKey, setSessionKey] = useState(0);

  // Fetch session words on mount or when sessionKey changes (play again)
  useEffect(() => {
    async function fetchSession() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const params = new URLSearchParams();
        if (kidId) params.set("kidId", kidId);
        params.set("timezone", tz);

        const res = await fetch(`/api/sight-words/session?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch session");

        const data = await res.json();
        const words: SightWord[] = data.words || [];

        if (words.length === 0) {
          // No words available, go straight to complete
          dispatch({ type: "START_SESSION", words: [] });
          dispatch({ type: "COMPLETE" });
        } else {
          dispatch({ type: "START_SESSION", words });
        }
      } catch (err) {
        console.error("Failed to load session:", err);
        // Fallback: complete with no words
        dispatch({ type: "START_SESSION", words: [] });
        dispatch({ type: "COMPLETE" });
      }
    }

    fetchSession();
  }, [kidId, sessionKey]);

  // Record results on complete
  useEffect(() => {
    if (state.step !== "complete" || state.words.length === 0) return;

    async function recordResults() {
      try {
        // Record each correct word
        for (const word of state.words) {
          await fetch("/api/sight-words/quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sightWordId: word.id,
              answer: word.word,
              kidId,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
          });
        }
      } catch (err) {
        console.error("Failed to record results:", err);
      }
    }

    if (state.correctCount > 0) {
      recordResults();
    }
  }, [state.step, state.words, state.correctCount, kidId]);

  const handleDismissCelebration = useCallback(() => {
    dispatch({ type: "DISMISS_CELEBRATION" });
  }, []);

  const handlePlayAgain = () => {
    dispatch({ type: "START_SESSION", words: [] });
    setSessionKey((k) => k + 1);
  };

  // Calculate progress
  const progress = state.total > 0 ? (state.wordIndex / state.total) * 100 : 0;

  // Current word
  const currentWord = state.words[state.wordIndex];

  // --- Render ---

  if (state.step === "loading") {
    return (
      <div className="min-h-screen bg-ca-cream flex items-center justify-center">
        <div className="text-ca-muted text-lg font-semibold">Loading session...</div>
      </div>
    );
  }

  if (state.step === "complete") {
    return (
      <SessionComplete
        kidName={kidName || "Champ"}
        coins={state.coins}
        bestCombo={state.bestCombo}
        correctCount={state.correctCount}
        total={state.total}
        onHome={onExit}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ca-cream flex flex-col">
      <LearnHeader
        subject={state.subject === "sight-words" ? "Sight Words" : "Math"}
        combo={state.combo}
        progress={progress}
        coins={state.coins}
        onClose={onExit}
      />

      {/* Screen content */}
      {state.step === "preview" && currentWord && (
        <LearnPreview
          word={currentWord}
          onReady={() => dispatch({ type: "ADVANCE_TO_QUIZ" })}
        />
      )}

      {state.step === "quiz" && currentWord && (
        <SightWordsMissing
          word={currentWord}
          onCorrect={() => dispatch({ type: "CORRECT_ANSWER" })}
          onWrong={() => dispatch({ type: "WRONG_ANSWER" })}
        />
      )}

      {state.step === "math" && (
        <MathSolve
          onCorrect={() => dispatch({ type: "CORRECT_ANSWER" })}
          onWrong={() => dispatch({ type: "WRONG_ANSWER" })}
        />
      )}

      {state.step === "speed" && (
        <MathSpeedRound
          onCorrect={() => dispatch({ type: "CORRECT_ANSWER" })}
          onWrong={() => dispatch({ type: "WRONG_ANSWER" })}
          onTimeUp={() => dispatch({ type: "COMPLETE" })}
        />
      )}

      {/* Celebration overlay */}
      {state.showCelebration && (
        <CorrectCelebration
          combo={state.combo}
          onDismiss={handleDismissCelebration}
        />
      )}
    </div>
  );
}
