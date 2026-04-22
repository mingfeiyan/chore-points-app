"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";
import { Volume2, BookOpen, Trophy, RotateCcw, PartyPopper } from "lucide-react";

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

type Phase = "study" | "quiz" | "done";

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
  const [phase, setPhase] = useState<Phase>("study");
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
            : "study"
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
      <div className="bg-white rounded-2xl p-5 border border-[rgba(26,24,19,0.06)] text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ca-tile-teal mb-2">
          <BookOpen size={28} className="text-ca-teal" />
        </div>
        <h2 className="text-lg font-extrabold text-ca-ink mt-2">{t("noWordsYet")}</h2>
        <p className="text-sm text-ca-muted mt-1">Ask a parent to add some sight words.</p>
      </div>
    );
  }

  if (data?.message === "alreadyDoneToday") {
    return (
      <div className="bg-white rounded-2xl p-5 border border-[rgba(26,24,19,0.06)] text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ca-tile-mint mb-2">
          <PartyPopper size={28} className="text-ca-mint" />
        </div>
        <h2 className="text-lg font-extrabold text-ca-ink mt-2">{t("allDoneToday")}</h2>
        <p className="text-sm text-ca-muted mt-1">{t("allDoneTodayDesc")}</p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ca-tile-mint text-ca-mint text-sm font-bold">
          {data.progress.total}/{data.progress.total} {t("wordsMastered")}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { words, isReview, progress } = data;

  const cardGradient = "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 70%, #0d2480 100%)";

  return (
    <div className="max-w-lg mx-auto font-[family-name:var(--font-nunito)]">
      <div className="mb-5">
        <div className="flex justify-between text-sm font-bold text-ca-muted mb-1.5">
          <span>{isReview ? t("reviewProgress") : t("progress")}</span>
          <span>
            {progress.current}/{progress.total}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[rgba(26,24,19,0.06)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
              background: "linear-gradient(90deg, var(--ca-cobalt), var(--ca-sky))",
            }}
          />
        </div>
      </div>

      {phase === "study" && words[studyIndex] && (
        <div className="text-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ca-muted mb-2">
            {t("study.heading", {
              current: studyIndex + 1,
              total: words.length,
            })}
          </h2>
          <div
            className="rounded-3xl p-6 text-white shadow-xl"
            style={{ background: cardGradient }}
          >
            {words[studyIndex].imageUrl ? (
              <img
                src={words[studyIndex].imageUrl!}
                alt={words[studyIndex].word}
                className="w-44 h-44 object-cover rounded-2xl mx-auto mb-5 border-4 border-white/20"
              />
            ) : (
              <div className="w-44 h-44 bg-white/15 rounded-2xl mx-auto mb-5 flex items-center justify-center">
                <BookOpen size={56} className="text-white/70" />
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mb-5">
              <h1 className="text-5xl sm:text-6xl font-black tracking-wide font-[family-name:var(--font-baloo-2)]">
                {words[studyIndex].word}
              </h1>
              <button
                onClick={() => speak(words[studyIndex].word)}
                aria-label={t("speak")}
                className="bg-white/15 hover:bg-white/25 rounded-full p-3 transition-colors"
              >
                <Volume2 size={22} />
              </button>
            </div>

            <button
              onClick={handleNextStudy}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold"
              style={{ background: "var(--ca-gold)", color: "var(--ca-gold-deep)" }}
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-ca-muted mb-2">
            {t("quiz.heading", {
              current: quizIndex + 1,
              total: quizItems.length,
            })}
          </h2>
          <div
            className="rounded-3xl p-6 text-white shadow-xl"
            style={{ background: cardGradient }}
          >
            {currentQuizItem.word.imageUrl ? (
              <img
                src={currentQuizItem.word.imageUrl!}
                alt="Hint"
                className="w-36 h-36 object-cover rounded-2xl mx-auto mb-4 border-4 border-white/20"
              />
            ) : (
              <div className="w-36 h-36 bg-white/15 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <BookOpen size={48} className="text-white/70" />
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="text-4xl sm:text-5xl font-black tracking-[0.3em] font-[family-name:var(--font-baloo-2)]">
                {currentQuizItem.display.split("").map((ch, i) => (
                  <span
                    key={i}
                    style={ch === "_" ? { color: "var(--ca-gold)" } : undefined}
                  >
                    {ch === "_" ? "_" : ch}
                  </span>
                ))}
              </div>
              <button
                onClick={() => speak(currentQuizItem.word.word)}
                aria-label={t("speak")}
                className="bg-white/15 hover:bg-white/25 rounded-full p-3 transition-colors"
              >
                <Volume2 size={22} />
              </button>
            </div>

            <p className="text-white/80 text-sm mb-4">
              {currentQuizItem.hiddenIndex === null
                ? t("quiz.typeWord")
                : t("quiz.typeMissingLetter")}
            </p>

            {feedback === "correct" ? (
              <div>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-3">
                  <PartyPopper size={28} className="text-ca-gold" />
                </div>
                <h3 className="text-xl font-black mb-4 font-[family-name:var(--font-baloo-2)]">{t("correct")}</h3>
                <button
                  onClick={handleNextQuiz}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold"
                  style={{ background: "var(--ca-gold)", color: "var(--ca-gold-deep)" }}
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
                  className="w-28 text-center text-5xl font-black py-3 rounded-2xl border-4 border-white/20 bg-white text-ca-ink placeholder-ca-muted focus:outline-none focus:border-white mb-3 font-[family-name:var(--font-baloo-2)]"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoFocus
                />
                {feedback === "wrong" && (
                  <p className="text-white/90 text-base mb-3">
                    {t("quiz.tryAgain")}
                  </p>
                )}
                <div className="flex gap-2 justify-center items-center">
                  {feedback === "wrong" && (
                    <button
                      type="button"
                      onClick={handleTryAgain}
                      aria-label="Try again"
                      className="bg-white/15 hover:bg-white/25 rounded-full p-3 transition-colors"
                    >
                      <RotateCcw size={18} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !userInput.trim()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold disabled:opacity-50"
                    style={{ background: "var(--ca-gold)", color: "var(--ca-gold-deep)" }}
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
          <div
            className="rounded-3xl p-6 text-white shadow-xl"
            style={{ background: "linear-gradient(160deg, var(--ca-coral) 0%, var(--ca-gold) 100%)" }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/15 mb-3">
              <Trophy size={44} className="text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2 font-[family-name:var(--font-baloo-2)]">
              {t("done.title")}
            </h2>
            <p className="text-white/90 text-lg mb-5">
              {t("done.earned", { points: pointsEarned })}
            </p>
            <button
              onClick={fetchSession}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold"
              style={{ background: "#fff", color: "var(--ca-coral)" }}
            >
              {t("done.again")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
