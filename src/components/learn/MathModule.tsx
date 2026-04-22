"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";
import { PartyPopper, Trophy } from "lucide-react";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 font-[family-name:var(--font-nunito)]">
        <div className="animate-pulse">
          <div className="w-64 h-48 bg-[rgba(26,24,19,0.06)] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8 text-ca-muted font-[family-name:var(--font-nunito)]">
        Failed to load math problems
      </div>
    );
  }

  if (allComplete) {
    return (
      <div className="text-center py-4 font-[family-name:var(--font-nunito)]">
        <div
          className="rounded-3xl p-6 text-white shadow-xl"
          style={{ background: "linear-gradient(160deg, var(--ca-coral) 0%, var(--ca-gold) 100%)" }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/15 mb-3">
            <Trophy size={44} className="text-white" />
          </div>
          <h2 className="text-2xl font-black font-[family-name:var(--font-baloo-2)]">{t("mathComplete")}</h2>
          <p className="text-white/90 mt-2">
            +{data.questionsTarget} {data.questionsTarget === 1 ? "point" : "points"} earned!
          </p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-8 text-ca-muted font-[family-name:var(--font-nunito)]">
        No questions available
      </div>
    );
  }

  const operator = operatorMap[currentQuestion.type] || "+";
  const typeLabel = data?.source === "custom" ? t("customPractice") : t(currentQuestion.type);
  const cardGradient = "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 70%, #0d2480 100%)";

  return (
    <div className="text-center font-[family-name:var(--font-nunito)]">
      <h2 className="text-sm font-bold uppercase tracking-wider text-ca-muted mb-2">{typeLabel}</h2>

      <div
        className={`rounded-3xl p-6 text-white shadow-xl ${shake ? "animate-shake" : ""}`}
        style={{ background: cardGradient }}
      >
        <div className="mb-5">
          {data?.source === "custom" ? (
            <span className="text-4xl sm:text-5xl font-black tracking-wide font-[family-name:var(--font-baloo-2)]">
              {currentQuestion.question} = ?
            </span>
          ) : (
            <span className="text-5xl sm:text-6xl font-black tracking-wide font-[family-name:var(--font-baloo-2)]">
              {currentQuestion.a} {operator} {currentQuestion.b} = ?
            </span>
          )}
        </div>

        {result && !result.correct && (
          <div className="mb-3 text-white/90 text-base">{t("incorrect")}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("typeMathAnswer")}
            className="w-full max-w-[220px] text-center text-4xl font-black py-3 px-5 rounded-2xl border-4 border-white/20 bg-white text-ca-ink placeholder:text-base placeholder:font-medium placeholder-ca-muted focus:outline-none focus:border-white mb-5 font-[family-name:var(--font-baloo-2)]"
            autoComplete="off"
            autoFocus
          />
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitting || !answer.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold disabled:opacity-50"
              style={{ background: "var(--ca-gold)", color: "var(--ca-gold-deep)" }}
            >
              {submitting ? "..." : t("submit")}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-3 text-sm font-bold text-ca-muted">
        {t("step")} {currentIndex + 1} {t("of")} {data.questionsTarget}
      </div>

      {pointFlash && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-ca-mint font-extrabold text-base animate-bounce">
          <PartyPopper size={18} /> +1
        </div>
      )}
    </div>
  );
}
