"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type Kid = { id: string; name: string | null };

type Stats = {
  total: number;
  correct: number;
  accuracy: number;
  byType: Record<string, { total: number; correct: number; accuracy: number }>;
  streak: number;
  topMistakes: { pattern: string; count: number }[];
  period: { days: number; since: string };
};

type Attempt = {
  id: string;
  questionType: string;
  question: string;
  correctAnswer: number;
  givenAnswer: number;
  isCorrect: boolean;
  createdAt: string;
};

type Insight = {
  type: "strength" | "weakness" | "pattern" | "suggestion" | "info";
  message: string;
};

type Props = {
  kids: Kid[];
  defaultKidId: string;
};

const cardClass = "bg-white rounded-[14px] border border-pg-line p-4";
const inputClass =
  "block w-full rounded-[10px] border border-pg-line bg-white text-pg-ink px-3 py-2 focus:outline-none focus:border-pg-accent transition-colors";
const labelClass = "block text-sm font-semibold text-pg-ink mb-1";
const primaryBtn: React.CSSProperties = {
  background: "#4a6a32",
  boxShadow: "0 2px 0 rgba(74,106,50,0.3)",
};

export default function MathAnalytics({ kids, defaultKidId }: Props) {
  const [selectedKidId, setSelectedKidId] = useState(defaultKidId);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const t = useTranslations("learn");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, attemptsRes] = await Promise.all([
        fetch(`/api/math/stats?kidId=${selectedKidId}&days=${days}`),
        fetch(`/api/math/attempts?kidId=${selectedKidId}&incorrectOnly=true&limit=50`),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (attemptsRes.ok) {
        const data = await attemptsRes.json();
        setAttempts(data.attempts);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedKidId, days]);

  useEffect(() => {
    fetchData();
    setInsights([]);
  }, [fetchData]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/math/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId: selectedKidId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedKid = kids.find((k) => k.id === selectedKidId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className={labelClass}>{t("kid")}</label>
          <select
            value={selectedKidId}
            onChange={(e) => setSelectedKidId(e.target.value)}
            className={inputClass}
          >
            {kids.map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.name || t("unnamed")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("period")}</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={inputClass}
          >
            <option value={7}>{t("last7Days")}</option>
            <option value={30}>{t("last30Days")}</option>
            <option value={90}>{t("last90Days")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pg-accent-deep mx-auto"></div>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={cardClass}>
              <div className="text-xs font-semibold uppercase tracking-wide text-pg-muted">
                {t("totalQuestions")}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink mt-1">
                {stats.total}
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs font-semibold uppercase tracking-wide text-pg-muted">
                {t("accuracy")}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-accent-deep mt-1">
                {stats.accuracy}%
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs font-semibold uppercase tracking-wide text-pg-muted">
                {t("currentStreak")}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-coral mt-1">
                {stats.streak} {t("days")}
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs font-semibold uppercase tracking-wide text-pg-muted">
                {t("correct")}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink mt-1">
                {stats.correct}/{stats.total}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-semibold text-pg-ink mb-3">{t("accuracyByType")}</h3>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-24 capitalize text-sm text-pg-ink">
                    {t(type as "addition" | "subtraction" | "multiplication" | "division")}
                  </span>
                  <div className="flex-1 bg-pg-cream rounded-full h-3 border border-pg-line">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${data.accuracy}%`, background: "#6b8e4e" }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-pg-ink">
                    {data.accuracy}%
                  </span>
                  <span className="w-20 text-right text-xs text-pg-muted">
                    ({data.correct}/{data.total})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-pg-ink">{t("aiInsights")}</h3>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 rounded-[10px] text-white text-sm font-semibold disabled:opacity-50 transition-transform hover:scale-[1.01]"
                style={primaryBtn}
              >
                {analyzing ? t("analyzing") : t("analyzeBtn")}
              </button>
            </div>
            {insights.length > 0 ? (
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li
                    key={i}
                    className={`p-3 rounded-[10px] text-sm border ${
                      insight.type === "strength"
                        ? "bg-[rgba(107,142,78,0.08)] border-[rgba(107,142,78,0.25)] text-pg-accent-deep"
                        : insight.type === "weakness"
                        ? "bg-[rgba(197,84,61,0.08)] border-[rgba(197,84,61,0.25)] text-pg-coral"
                        : insight.type === "pattern"
                        ? "bg-[rgba(212,166,116,0.12)] border-[rgba(212,166,116,0.3)] text-[#a87a3c]"
                        : insight.type === "suggestion"
                        ? "bg-[rgba(127,168,221,0.1)] border-[rgba(127,168,221,0.3)] text-[#4a6a8a]"
                        : "bg-pg-cream border-pg-line text-pg-ink"
                    }`}
                  >
                    {insight.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-pg-muted text-sm">
                {t("analyzeInsightsDesc", { name: selectedKid?.name || t("unnamed") })}
              </p>
            )}
          </div>

          <div className={cardClass}>
            <h3 className="font-semibold text-pg-ink mb-3">{t("recentMistakes")}</h3>
            {attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pg-line">
                      <th className="text-left py-2 text-xs font-bold uppercase tracking-wide text-pg-muted">
                        {t("date")}
                      </th>
                      <th className="text-left py-2 text-xs font-bold uppercase tracking-wide text-pg-muted">
                        {t("question")}
                      </th>
                      <th className="text-left py-2 text-xs font-bold uppercase tracking-wide text-pg-muted">
                        {t("given")}
                      </th>
                      <th className="text-left py-2 text-xs font-bold uppercase tracking-wide text-pg-muted">
                        {t("correctAnswer")}
                      </th>
                      <th className="text-left py-2 text-xs font-bold uppercase tracking-wide text-pg-muted">
                        {t("type")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b border-[rgba(68,55,32,0.06)]">
                        <td className="py-2 text-pg-ink">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 font-mono text-pg-ink">{attempt.question}</td>
                        <td className="py-2 text-pg-coral">{attempt.givenAnswer}</td>
                        <td className="py-2 text-pg-accent-deep">{attempt.correctAnswer}</td>
                        <td className="py-2 capitalize text-pg-muted">
                          {t(attempt.questionType as "addition" | "subtraction" | "multiplication" | "division")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-pg-muted text-sm">{t("noMistakes")}</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-pg-muted">{t("noDataAvailable")}</p>
      )}
    </div>
  );
}
