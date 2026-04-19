"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";

type SightWord = {
  id: string;
  word: string;
  imageUrl: string | null;
};

type SessionResponse = {
  words: SightWord[];
  message?: "noWords" | "alreadyDoneToday";
  isReview?: boolean;
  progress: { current: number; total: number };
};

type Phase = "intro" | "study" | "quiz" | "done";

type QuizItem = {
  word: SightWord;
  display: string;
  hiddenIndex: number | null;
  answer: string;
};

type Props = {
  kidId?: string;
  onComplete?: () => void;
};

function speak(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = 0.8;
  utter.lang = "en-US";
  window.speechSynthesis.speak(utter);
}

function buildQuizItem(word: SightWord): QuizItem {
  if (word.word.length <= 1) {
    return {
      word,
      display: "_",
      hiddenIndex: null,
      answer: word.word.toLowerCase(),
    };
  }
  const idx = 1 + Math.floor(Math.random() * (word.word.length - 1));
  const display = word.word
    .split("")
    .map((c, i) => (i === idx ? "_" : c))
    .join("");
  return {
    word,
    display,
    hiddenIndex: idx,
    answer: word.word[idx].toLowerCase(),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function LearnView({ kidId, onComplete }: Props) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [studyIndex, setStudyIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [userInput, setUserInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const t = useTranslations("learn");

  const timezone = useMemo(
    () =>
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "America/Los_Angeles",
    []
  );

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ timezone });
      if (kidId) params.set("kidId", kidId);
      const res = await fetch(`/api/sight-words/session?${params.toString()}`);
      const result = (await res.json()) as SessionResponse;
      if (res.ok) {
        setData(result);
        setPhase(
          result.message === "alreadyDoneToday" || result.message === "noWords"
            ? "done"
            : "intro"
        );
        setStudyIndex(0);
        setQuizIndex(0);
        setUserInput("");
        setFeedback(null);
        setPointsEarned(0);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setLoading(false);
    }
  }, [kidId, timezone]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const activeWord =
    phase === "study"
      ? data?.words[studyIndex]?.word
      : phase === "quiz"
        ? quizItems[quizIndex]?.word.word
        : null;

  useEffect(() => {
    if (!activeWord) return;
    const timeout = setTimeout(() => speak(activeWord), 200);
    return () => clearTimeout(timeout);
  }, [activeWord]);

  const handleStartStudy = () => {
    setPhase("study");
    setStudyIndex(0);
  };

  const handleNextStudy = () => {
    if (!data) return;
    if (studyIndex < data.words.length - 1) {
      setStudyIndex(studyIndex + 1);
    } else {
      setQuizItems(shuffle(data.words.map(buildQuizItem)));
      setQuizIndex(0);
      setUserInput("");
      setFeedback(null);
      setPhase("quiz");
    }
  };

  const currentQuizItem = quizItems[quizIndex];

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuizItem || submitting || feedback === "correct") return;

    const typed = userInput.trim().toLowerCase();
    if (!typed) return;

    const isCorrect = typed === currentQuizItem.answer;

    if (!isCorrect) {
      setFeedback("wrong");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sight-words/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sightWordId: currentQuizItem.word.id,
          answer: currentQuizItem.word.word,
          kidId,
          timezone,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        console.error("Quiz submit failed:", result);
        setFeedback("wrong");
        return;
      }

      setFeedback("correct");
      if (result.pointAwarded) {
        setPointsEarned((p) => p + 1);
      }
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      setFeedback("wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuiz = () => {
    if (quizIndex < quizItems.length - 1) {
      setQuizIndex(quizIndex + 1);
      setUserInput("");
      setFeedback(null);
    } else {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
      });
      setPhase("done");
      onComplete?.();
    }
  };

  const handleTryAgain = () => {
    setUserInput("");
    setFeedback(null);
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

  if (data?.message === "noWords" || (data && data.words.length === 0 && data.message !== "alreadyDoneToday")) {
    return (
      <div className="text-center py-16">
        <span className="text-8xl mb-4 block">📚</span>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t("noWordsYet")}</h2>
        <p className="text-gray-500">Ask your parent to add some sight words!</p>
      </div>
    );
  }

  if (data?.message === "alreadyDoneToday") {
    return (
      <div className="text-center py-16">
        <span className="text-8xl mb-4 block">✅</span>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t("allDoneToday")}</h2>
        <p className="text-gray-500">{t("allDoneTodayDesc")}</p>
        <div className="mt-6">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full">
            <span className="font-bold">
              {data.progress.total}/{data.progress.total}
            </span>
            <span className="ml-2">{t("wordsMastered")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { words, isReview, progress } = data;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{isReview ? t("reviewProgress") : t("progress")}</span>
          <span>
            {progress.current}/{progress.total}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{
              width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {phase === "intro" && (
        <div className="text-center">
          {isReview && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                🔄 {t("reviewWord")}
              </span>
            </div>
          )}
          <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl p-8 shadow-2xl">
            <span className="text-8xl block mb-4">📚</span>
            <h2 className="text-3xl font-bold text-white mb-2">
              {t("intro.title", { count: words.length })}
            </h2>
            <p className="text-white/90 mb-6">{t("intro.subtitle")}</p>
            <button
              onClick={handleStartStudy}
              className="bg-white text-purple-600 font-bold text-xl px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              {t("intro.start")} ✨
            </button>
          </div>
        </div>
      )}

      {phase === "study" && words[studyIndex] && (
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">
            {t("study.heading", {
              current: studyIndex + 1,
              total: words.length,
            })}
          </h2>
          <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl p-8 shadow-2xl">
            {words[studyIndex].imageUrl ? (
              <img
                src={words[studyIndex].imageUrl!}
                alt={words[studyIndex].word}
                className="w-48 h-48 object-cover rounded-2xl mx-auto mb-6 shadow-lg border-4 border-white/30"
              />
            ) : (
              <div className="w-48 h-48 bg-white/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-8xl">📖</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mb-6">
              <h1 className="text-6xl sm:text-7xl font-bold text-white tracking-wide drop-shadow-lg">
                {words[studyIndex].word}
              </h1>
              <button
                onClick={() => speak(words[studyIndex].word)}
                aria-label={t("speak")}
                className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition"
              >
                <span className="text-2xl">🔊</span>
              </button>
            </div>

            <button
              onClick={handleNextStudy}
              className="bg-white text-purple-600 font-bold text-xl px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              {studyIndex < words.length - 1
                ? t("study.next")
                : t("study.readyForQuiz")}{" "}
              →
            </button>
          </div>
        </div>
      )}

      {phase === "quiz" && currentQuizItem && (
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">
            {t("quiz.heading", {
              current: quizIndex + 1,
              total: quizItems.length,
            })}
          </h2>
          <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8 shadow-2xl">
            {currentQuizItem.word.imageUrl ? (
              <img
                src={currentQuizItem.word.imageUrl!}
                alt="Hint"
                className="w-40 h-40 object-cover rounded-2xl mx-auto mb-4 shadow-lg border-4 border-white/30"
              />
            ) : (
              <div className="w-40 h-40 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-6xl">🤔</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-5xl font-bold text-white tracking-[0.4em] drop-shadow-lg font-mono">
                {currentQuizItem.display.split("").map((ch, i) => (
                  <span
                    key={i}
                    className={ch === "_" ? "text-yellow-200" : ""}
                  >
                    {ch === "_" ? "_" : ch}
                  </span>
                ))}
              </div>
              <button
                onClick={() => speak(currentQuizItem.word.word)}
                aria-label={t("speak")}
                className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition"
              >
                <span className="text-2xl">🔊</span>
              </button>
            </div>

            <p className="text-white/90 text-sm mb-4">
              {currentQuizItem.hiddenIndex === null
                ? t("quiz.typeWord")
                : t("quiz.typeMissingLetter")}
            </p>

            {feedback === "correct" ? (
              <div className="text-white">
                <span className="text-6xl block mb-2">🎉</span>
                <h3 className="text-2xl font-bold mb-4">{t("correct")}</h3>
                <button
                  onClick={handleNextQuiz}
                  className="bg-white text-teal-600 font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl"
                >
                  {quizIndex < quizItems.length - 1
                    ? t("quiz.next")
                    : t("quiz.finish")}{" "}
                  →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitAnswer}>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    if (feedback === "wrong") setFeedback(null);
                  }}
                  placeholder="?"
                  maxLength={
                    currentQuizItem.hiddenIndex === null
                      ? currentQuizItem.word.word.length
                      : 1
                  }
                  className="w-32 text-center text-5xl font-bold py-3 rounded-2xl border-4 border-white/30 bg-white/90 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-white mb-4"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoFocus
                />
                {feedback === "wrong" && (
                  <p className="text-white text-lg mb-3">
                    🤔 {t("quiz.tryAgain")}
                  </p>
                )}
                <div className="flex gap-3 justify-center">
                  {feedback === "wrong" && (
                    <button
                      type="button"
                      onClick={handleTryAgain}
                      className="bg-white/20 text-white font-bold px-4 py-3 rounded-full hover:bg-white/30"
                    >
                      ↺
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !userInput.trim()}
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

      {phase === "done" && (
        <div className="text-center">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 shadow-2xl">
            <span className="text-8xl block mb-4">🏆</span>
            <h2 className="text-3xl font-bold text-white mb-2">
              {t("done.title")}
            </h2>
            <p className="text-white/90 text-xl mb-6">
              {t("done.earned", { points: pointsEarned })}
            </p>
            <button
              onClick={fetchSession}
              className="bg-white text-orange-600 font-bold text-xl px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              {t("done.again")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
