"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
  ingredients: string[];
};

type BreakdownCategory = {
  status: "good" | "limited" | "missing";
  items: string[];
};

type Feedback = {
  summary: string;
  breakdown: {
    proteins: BreakdownCategory;
    vegetables: BreakdownCategory;
    grains: BreakdownCategory;
    dairy: BreakdownCategory;
    fruits: BreakdownCategory;
  };
  suggestions: string[];
  missingIngredientsDishes: string[];
};

type MealPlanFeedbackProps = {
  dishes: Dish[];
  autoFetch?: boolean;
};

export default function MealPlanFeedback({
  dishes,
  autoFetch = false,
}: MealPlanFeedbackProps) {
  const t = useTranslations("meals");
  const locale = useLocale();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    if (dishes.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meal-plans/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishes: dishes.map((d) => ({
            name: d.name,
            ingredients: d.ingredients || [],
          })),
          language: locale,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get feedback");
      }

      const data = await response.json();
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [dishes, locale]);

  useEffect(() => {
    if (autoFetch && dishes.length > 0) {
      fetchFeedback();
    }
  }, [autoFetch, dishes.length, fetchFeedback]);

  if (dishes.length === 0) {
    return null;
  }

  const getStatusIcon = (status: "good" | "limited" | "missing") => {
    switch (status) {
      case "good":
        return <span className="text-green-600">✓</span>;
      case "limited":
        return <span className="text-yellow-600">⚠</span>;
      case "missing":
        return <span className="text-red-600">✗</span>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      proteins: t("feedbackProteins"),
      vegetables: t("feedbackVegetables"),
      grains: t("feedbackGrains"),
      dairy: t("feedbackDairy"),
      fruits: t("feedbackFruits"),
    };
    return labels[category] || category;
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>🍎</span> {t("healthFeedback")}
        </h3>
        {!loading && (
          <button
            onClick={fetchFeedback}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            {feedback ? t("refreshFeedback") : t("getFeedback")}
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
            <span className="text-gray-600">{t("analyzingMealPlan")}</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-red-600 mb-3">{error}</p>
          <button
            onClick={fetchFeedback}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* Feedback Content */}
      {feedback && !loading && !error && (
        <div className="bg-white rounded-lg shadow divide-y">
          {/* Summary */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t("feedbackSummary")}
            </h4>
            <p className="text-gray-900">{feedback.summary}</p>
          </div>

          {/* Breakdown */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t("feedbackBreakdown")}
            </h4>
            <div className="space-y-2">
              {Object.entries(feedback.breakdown).map(([category, data]) => (
                <div key={category} className="flex items-start gap-2">
                  {getStatusIcon(data.status)}
                  <div>
                    <span className="font-medium">{getCategoryLabel(category)}:</span>{" "}
                    <span className="text-gray-600">
                      {data.items.length > 0
                        ? data.items.join(", ")
                        : t("feedbackNone")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t("feedbackSuggestions")}
            </h4>
            <ul className="space-y-2">
              {feedback.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="text-orange-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Missing Ingredients Notice */}
          {feedback.missingIngredientsDishes.length > 0 && (
            <div className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-blue-500">ⓘ</span>
                {t("feedbackMissingIngredients", {
                  count: feedback.missingIngredientsDishes.length,
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial State - No feedback yet */}
      {!feedback && !loading && !error && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-3">{t("feedbackPrompt")}</p>
          <button
            onClick={fetchFeedback}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            {t("getFeedback")}
          </button>
        </div>
      )}
    </div>
  );
}
