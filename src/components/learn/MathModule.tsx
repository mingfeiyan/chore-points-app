"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";

type Question = {
  index: number;
  type: string;
  a?: number;
  b?: number;
  question: string;
};

type MathData = {
  questions: Question[];
  questionsCompleted: number;
  questionsTarget: number;
  allComplete: boolean;
  pointAwarded: boolean;
  source: "custom" | "auto";
};

type Props = {
  kidId?: string;
  onComplete: () => void;
};

const operatorMap: Record<string, string> = {
  addition: "+",
  subtraction: "−",
  multiplication: "×",
  division: "÷",
};

export default function MathModule({ kidId, onComplete }: Props) {
  const [data, setData] = useState<MathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    pointAwarded: boolean;
  } | null>(null);
  const [shake, setShake] = useState(false);
  const [pointFlash, setPointFlash] = useState(false);
  const questionStartTime = useRef<number>(Date.now());
  const t = useTranslations("learn");

  // Current question index
  const currentIndex = data?.questionsCompleted ?? 0;
  const currentQuestion = data?.questions?.[currentIndex];
  const allComplete = data?.allComplete ?? false;

  useEffect(() => {
    fetchMathData();
  }, [kidId]);

  // Reset timer when moving to next question
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  const fetchMathData = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({ timezone });
      if (kidId) params.set("kidId", kidId);

      const response = await fetch(`/api/math/today?${params.toString()}`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
        if (result.allComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error("Failed to fetch math data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || submitting || !answer.trim() || !currentQuestion) return;

    const numAnswer = parseInt(answer, 10);
    if (isNaN(numAnswer)) return;

    const responseTimeMs = Date.now() - questionStartTime.current;
    setSubmitting(true);
    setResult(null);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/math/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: currentIndex,
          answer: numAnswer,
          kidId,
          timezone,
          responseTimeMs,
          source: data?.source === "custom" ? "custom" : "daily",
        }),
      });

      const result = await response.json();
      setResult(result);

      if (result.correct) {
        // Update local state
        setData((prev) =>
          prev
            ? {
                ...prev,
                questionsCompleted: result.questionsCompleted ?? prev.questionsCompleted + 1,
                allComplete: result.allComplete ?? false,
                pointAwarded: result.pointAwarded,
              }
            : null
        );
        setAnswer("");
        questionStartTime.current = Date.now();

        // Show +1 point flash after each correct answer
        if (result.pointAwarded && !result.allComplete) {
          setPointFlash(true);
          setTimeout(() => setPointFlash(false), 1200);
        }

        if (result.allComplete) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          onComplete();
        }
      } else {
        // Wrong answer - shake animation
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse">
          <div className="w-64 h-48 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  // No data state (API error)
  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Failed to load math problems</div>
      </div>
    );
  }

  // All complete state
  if (allComplete) {
    return (
      <div className="text-center py-8">
        <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8">
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-bold text-white">{t("mathComplete")}</h2>
          <p className="text-white/80 mt-2">
            +{data.questionsTarget} {data.questionsTarget === 1 ? "point" : "points"} earned!
          </p>
        </div>
      </div>
    );
  }

  // No current question (shouldn't happen if not complete)
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">No questions available</div>
      </div>
    );
  }

  // Active problem state
  const operator = operatorMap[currentQuestion.type] || "+";
  const typeLabel = data?.source === "custom" ? t("customPractice") : t(currentQuestion.type);

  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold text-gray-600 mb-4">{typeLabel}</h2>

      <div
        className={`bg-gradient-to-br from-orange-400 to-yellow-500 rounded-3xl p-8 shadow-2xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Problem Display */}
        <div className="text-white mb-6">
          {data?.source === "custom" ? (
            <span className="text-4xl sm:text-5xl font-bold tracking-wide">
              {currentQuestion.question} = ?
            </span>
          ) : (
            <span className="text-6xl sm:text-7xl font-bold tracking-wide">
              {currentQuestion.a} {operator} {currentQuestion.b} = ?
            </span>
          )}
        </div>

        {/* Result feedback */}
        {result && !result.correct && (
          <div className="mb-4 text-white/90 text-lg">{t("incorrect")}</div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("typeMathAnswer")}
            className="w-full max-w-[240px] text-center text-4xl font-bold py-4 px-6 rounded-2xl border-4 border-white/30 bg-white/90 text-gray-800 placeholder:text-xl placeholder:font-normal placeholder-gray-400 focus:outline-none focus:border-white mb-6"
            autoComplete="off"
            autoFocus
          />
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitting || !answer.trim()}
              className="bg-white text-orange-600 font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? "..." : t("submit")}
            </button>
          </div>
        </form>
      </div>

      {/* Step indicator */}
      <div className="mt-4 text-sm text-gray-500">
        {t("step")} {currentIndex + 1} {t("of")} {data.questionsTarget}
      </div>

      {/* Point flash for custom questions */}
      {pointFlash && (
        <div className="mt-3 text-green-600 font-bold text-lg animate-bounce">
          +1 ⭐
        </div>
      )}
    </div>
  );
}
