"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";

type MathProblem = {
  a: number;
  b: number;
};

type MathData = {
  addition: MathProblem;
  subtraction: MathProblem;
  additionComplete: boolean;
  subtractionComplete: boolean;
  pointAwarded: boolean;
};

type Props = {
  kidId?: string;
  locked: boolean;
  onComplete: () => void;
};

export default function MathModule({ kidId, locked, onComplete }: Props) {
  const [data, setData] = useState<MathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    pointAwarded: boolean;
  } | null>(null);
  const [shake, setShake] = useState(false);
  const t = useTranslations("learn");

  // Current step: "addition" or "subtraction"
  const currentStep = data?.additionComplete ? "subtraction" : "addition";
  const bothComplete = data?.additionComplete && data?.subtractionComplete;

  useEffect(() => {
    if (!locked) {
      fetchMathData();
    }
  }, [locked, kidId]);

  const fetchMathData = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({ timezone });
      if (kidId) params.set("kidId", kidId);

      const response = await fetch(`/api/math/today?${params.toString()}`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
        if (result.additionComplete && result.subtractionComplete) {
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
    if (!data || submitting || !answer.trim()) return;

    const numAnswer = parseInt(answer, 10);
    if (isNaN(numAnswer)) return;

    setSubmitting(true);
    setResult(null);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/math/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: currentStep,
          answer: numAnswer,
          kidId,
          timezone,
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
                [currentStep === "addition"
                  ? "additionComplete"
                  : "subtractionComplete"]: true,
                pointAwarded: result.pointAwarded,
              }
            : null
        );
        setAnswer("");

        if (result.pointAwarded) {
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

  // Locked state
  if (locked) {
    return (
      <div className="text-center py-8">
        <div className="bg-gray-100 rounded-3xl p-8 opacity-60">
          <span className="text-6xl mb-4 block">🔒</span>
          <h2 className="text-xl font-bold text-gray-500">{t("math")}</h2>
          <p className="text-gray-400 mt-2">{t("mathLocked")}</p>
        </div>
      </div>
    );
  }

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

  // Both complete state
  if (bothComplete) {
    return (
      <div className="text-center py-8">
        <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8">
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-bold text-white">{t("mathComplete")}</h2>
          <p className="text-white/80 mt-2">{t("pointEarned")}</p>
        </div>
      </div>
    );
  }

  // Active problem state
  const problem =
    currentStep === "addition" ? data?.addition : data?.subtraction;
  const operator = currentStep === "addition" ? "+" : "−";
  const stepLabel = currentStep === "addition" ? t("addition") : t("subtraction");

  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold text-gray-600 mb-4">{stepLabel}</h2>

      <div
        className={`bg-gradient-to-br from-orange-400 to-yellow-500 rounded-3xl p-8 shadow-2xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Problem Display */}
        <div className="text-white mb-6">
          <span className="text-6xl sm:text-7xl font-bold tracking-wide">
            {problem?.a} {operator} {problem?.b} = ?
          </span>
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
            className="w-full max-w-[200px] text-center text-4xl font-bold py-4 px-6 rounded-2xl border-4 border-white/30 bg-white/90 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-white mb-6"
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
        {t("step")} {currentStep === "addition" ? "1" : "2"} {t("of")} 2
      </div>
    </div>
  );
}
