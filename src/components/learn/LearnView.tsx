"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";

type SightWord = {
  id: string;
  word: string;
  imageUrl: string | null;
};

type TodayResponse = {
  sightWord: SightWord | null;
  alreadyCompletedToday?: boolean;
  isReview?: boolean;
  message?: string;
  progress: { current: number; total: number };
};

type Props = {
  kidId?: string;
  onComplete?: () => void;
};

export default function LearnView({ kidId, onComplete }: Props) {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answer, setAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<{ correct: boolean; pointAwarded: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations("learn");
  const tCommon = useTranslations("common");

  useEffect(() => {
    fetchTodaysWord();
  }, [kidId]);

  useEffect(() => {
    if (data?.alreadyCompletedToday) {
      onComplete?.();
    }
  }, [data?.alreadyCompletedToday, onComplete]);

  const fetchTodaysWord = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({ timezone });
      if (kidId) params.set("kidId", kidId);
      const url = `/api/sight-words/today?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch today's word:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setAnswer("");
    setQuizResult(null);
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.sightWord || submitting) return;

    setSubmitting(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/sight-words/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sightWordId: data.sightWord.id,
          answer: answer.trim(),
          kidId, // Pass kidId for view-as mode
          timezone,
        }),
      });

      const result = await response.json();

      // Handle API errors (e.g., parent trying to submit in view-as mode)
      if (!response.ok) {
        setQuizResult({ correct: false, pointAwarded: false, message: result.error || "error" });
        return;
      }

      setQuizResult(result);

      if (result.correct && result.pointAwarded) {
        // Celebrate!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        // Update the data to show completed
        setData((prev) =>
          prev
            ? {
                ...prev,
                alreadyCompletedToday: true,
                progress: { ...prev.progress, current: prev.progress.current + 1 },
              }
            : null
        );
        onComplete?.();
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    setAnswer("");
    setQuizResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse">
          <div className="w-64 h-64 bg-gray-200 rounded-3xl mb-4" />
          <div className="w-48 h-8 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    );
  }

  // No words set up yet
  if (data?.message === "noWords" || !data?.sightWord) {
    return (
      <div className="text-center py-16">
        <span className="text-8xl mb-4 block">📚</span>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t("noWordsYet")}</h2>
        <p className="text-gray-500">Ask your parent to add some sight words!</p>
      </div>
    );
  }

  // All words completed and already reviewed today
  if (data?.message === "alreadyCompletedToday") {
    return (
      <div className="text-center py-16">
        <span className="text-8xl mb-4 block">✅</span>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t("allDoneToday")}</h2>
        <p className="text-gray-500">{t("allDoneTodayDesc")}</p>
        <div className="mt-6">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full">
            <span className="font-bold">{data.progress.total}/{data.progress.total}</span>
            <span className="ml-2">{t("wordsMastered")}</span>
          </div>
        </div>
      </div>
    );
  }

  const { sightWord, alreadyCompletedToday, progress } = data;

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{data?.isReview ? t("reviewProgress") : t("progress")}</span>
          <span>{progress.current}/{progress.total}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      {!showQuiz ? (
        <div className="text-center">
          {data.isReview && (
            <div className="mb-2">
              <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                🔄 {t("reviewWord")}
              </span>
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-600 mb-4">
            {data.isReview ? t("reviewTodaysWord") : t("todaysWord")}
          </h2>

          {/* Card */}
          <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl p-8 shadow-2xl transform hover:scale-[1.02] transition-transform">
            {/* Image */}
            {sightWord.imageUrl ? (
              <div className="mb-6">
                <img
                  src={sightWord.imageUrl}
                  alt={sightWord.word}
                  className="w-48 h-48 object-cover rounded-2xl mx-auto shadow-lg border-4 border-white/30"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-white/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-8xl">📖</span>
              </div>
            )}

            {/* Word */}
            <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 tracking-wide drop-shadow-lg">
              {sightWord.word}
            </h1>

            {/* Status or Quiz Button */}
            {alreadyCompletedToday ? (
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 inline-flex items-center">
                <span className="text-2xl mr-2">✅</span>
                <span className="text-white font-semibold">{t("alreadyCompleted")}</span>
              </div>
            ) : (
              <button
                onClick={handleStartQuiz}
                className="bg-white text-purple-600 font-bold text-xl px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                {t("takeQuiz")} 📝
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Quiz Mode */
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-600 mb-4">{t("spellTheWord")}</h2>

          {/* Quiz Card */}
          <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8 shadow-2xl">
            {/* Show image as hint */}
            {sightWord.imageUrl ? (
              <div className="mb-6">
                <img
                  src={sightWord.imageUrl}
                  alt="Hint"
                  className="w-40 h-40 object-cover rounded-2xl mx-auto shadow-lg border-4 border-white/30"
                />
              </div>
            ) : (
              <div className="w-40 h-40 bg-white/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-6xl">🤔</span>
              </div>
            )}

            {quizResult ? (
              /* Result */
              <div className="text-white">
                {quizResult.correct ? (
                  <>
                    <span className="text-8xl block mb-4">🎉</span>
                    <h3 className="text-3xl font-bold mb-2">{t("correct")}</h3>
                    {quizResult.pointAwarded && (
                      <p className="text-xl">+1 point earned!</p>
                    )}
                    <button
                      onClick={() => setShowQuiz(false)}
                      className="mt-6 bg-white text-teal-600 font-bold px-6 py-3 rounded-full"
                    >
                      {t("back")}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-8xl block mb-4">🤔</span>
                    <h3 className="text-3xl font-bold mb-2">{t("incorrect")}</h3>
                    <button
                      onClick={handleTryAgain}
                      className="mt-6 bg-white text-teal-600 font-bold px-6 py-3 rounded-full"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Input Form */
              <form onSubmit={handleSubmitQuiz}>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t("typeAnswer")}
                  className="w-full text-center text-4xl font-bold py-4 px-6 rounded-2xl border-4 border-white/30 bg-white/90 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-white mb-6"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoFocus
                />
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowQuiz(false)}
                    className="bg-white/20 text-white font-bold px-6 py-3 rounded-full hover:bg-white/30"
                  >
                    {t("back")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    className="bg-white text-teal-600 font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {submitting ? "..." : t("submit")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
