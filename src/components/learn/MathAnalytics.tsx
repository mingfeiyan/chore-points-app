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
    setInsights([]); // Clear insights when changing kid/period
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
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("kid")}
          </label>
          <select
            value={selectedKidId}
            onChange={(e) => setSelectedKidId(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {kids.map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.name || t("unnamed")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("period")}
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value={7}>{t("last7Days")}</option>
            <option value={30}>{t("last30Days")}</option>
            <option value={90}>{t("last90Days")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">{t("totalQuestions")}</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">{t("accuracy")}</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.accuracy}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">{t("currentStreak")}</div>
              <div className="text-2xl font-bold text-orange-500">
                {stats.streak} {t("days")}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">{t("correct")}</div>
              <div className="text-2xl font-bold">
                {stats.correct}/{stats.total}
              </div>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">{t("accuracyByType")}</h3>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-24 capitalize">{t(type as "addition" | "subtraction" | "multiplication" | "division")}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-500 h-4 rounded-full"
                      style={{ width: `${data.accuracy}%` }}
                    />
                  </div>
                  <span className="w-16 text-right">{data.accuracy}%</span>
                  <span className="w-20 text-right text-sm text-gray-500">
                    ({data.correct}/{data.total})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t("aiInsights")}</h3>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? t("analyzing") : t("analyzeBtn")}
              </button>
            </div>
            {insights.length > 0 ? (
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li
                    key={i}
                    className={`p-3 rounded-md ${
                      insight.type === "strength"
                        ? "bg-green-50 text-green-800"
                        : insight.type === "weakness"
                        ? "bg-red-50 text-red-800"
                        : insight.type === "pattern"
                        ? "bg-yellow-50 text-yellow-800"
                        : insight.type === "suggestion"
                        ? "bg-blue-50 text-blue-800"
                        : "bg-gray-50 text-gray-800"
                    }`}
                  >
                    {insight.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">
                {t("analyzeInsightsDesc", { name: selectedKid?.name || t("unnamed") })}
              </p>
            )}
          </div>

          {/* Mistake Log */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">{t("recentMistakes")}</h3>
            {attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{t("date")}</th>
                      <th className="text-left py-2">{t("question")}</th>
                      <th className="text-left py-2">{t("given")}</th>
                      <th className="text-left py-2">{t("correctAnswer")}</th>
                      <th className="text-left py-2">{t("type")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b">
                        <td className="py-2">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 font-mono">{attempt.question}</td>
                        <td className="py-2 text-red-600">
                          {attempt.givenAnswer}
                        </td>
                        <td className="py-2 text-green-600">
                          {attempt.correctAnswer}
                        </td>
                        <td className="py-2 capitalize">
                          {t(attempt.questionType as "addition" | "subtraction" | "multiplication" | "division")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">{t("noMistakes")}</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500">{t("noDataAvailable")}</p>
      )}
    </div>
  );
}
