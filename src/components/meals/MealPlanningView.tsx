"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getWeekStart } from "@/lib/week-utils";

// Types for dish library
type Dish = {
  id: string;
  name: string;
  photoUrl: string;
  ingredients: string[];
};

// Types for vote data
type Vote = {
  id: string;
  dishId: string | null;
  suggestedDishName: string | null;
  voter: { id: string; name: string; email: string };
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  } | null;
};

// Types for dish with vote count
type DishWithVotes = Dish & {
  voteCount: number;
  voters: string[];
};

// Types for meal entry
type MealDishEntry = {
  id: string;
  dishId: string | null;
  dishName: string;
  isFreeForm: boolean;
};

type MealEntry = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  notes: string;
  dishes: MealDishEntry[];
};

type DayPlan = {
  date: Date;
  dateStr: string;
  meals: MealEntry[];
};

// AI Feedback types
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

// Existing plan types from API
type ExistingPlan = {
  id: string;
  weekStart: string;
  weeklyStaples: string[];
  plannedDays: {
    id: string;
    date: string;
    meals: {
      id: string;
      mealType: string;
      notes: string | null;
      dishes: {
        id: string;
        dishId: string | null;
        dishName: string;
        isFreeForm: boolean;
        dish: { id: string; name: string; photoUrl: string; ingredients: string[] } | null;
      }[];
    }[];
  }[];
};

// Helper to format date as YYYY-MM-DD
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generate unique ID for client-side keys
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Common weekly staples
const COMMON_STAPLES = ["fruit", "milk", "vitamin", "eggs", "yogurt", "bread"];

export default function MealPlanningView() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const tCalendar = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();

  // Calculate next week start (next Saturday from today)
  const nextWeekStart = useMemo(() => {
    const today = new Date();
    const thisWeekStart = getWeekStart(today);
    const nextWeek = new Date(thisWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }, []);

  // State
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [weeklyStaples, setWeeklyStaples] = useState<string[]>([]);
  const [customStaple, setCustomStaple] = useState("");
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showVotes, setShowVotes] = useState(true);

  // AI Feedback state
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Day names
  const dayNames = [
    tCalendar("sat"),
    tCalendar("sun"),
    tCalendar("mon"),
    tCalendar("tue"),
    tCalendar("wed"),
    tCalendar("thu"),
    tCalendar("fri"),
  ];

  // Initialize day plans for the week
  const initializeDayPlans = useCallback(() => {
    const plans: DayPlan[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(nextWeekStart);
      date.setDate(date.getDate() + i);
      plans.push({
        date,
        dateStr: toDateString(date),
        meals: [],
      });
    }
    return plans;
  }, [nextWeekStart]);

  // Compute dishes with vote counts, sorted by votes
  const dishesWithVotes = useMemo(() => {
    const votesByDish: Record<string, { count: number; voters: string[] }> = {};

    votes.forEach((vote) => {
      if (vote.dishId) {
        if (!votesByDish[vote.dishId]) {
          votesByDish[vote.dishId] = { count: 0, voters: [] };
        }
        votesByDish[vote.dishId].count++;
        const voterName = vote.voter.name || vote.voter.email;
        if (!votesByDish[vote.dishId].voters.includes(voterName)) {
          votesByDish[vote.dishId].voters.push(voterName);
        }
      }
    });

    const result: DishWithVotes[] = dishes.map((dish) => ({
      ...dish,
      voteCount: votesByDish[dish.id]?.count || 0,
      voters: votesByDish[dish.id]?.voters || [],
    }));

    // Sort by vote count (descending), then by name
    result.sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [dishes, votes]);

  // Group votes for display
  const groupedVotes = useMemo(() => {
    const dishVotes: { dish: Vote["dish"]; voters: string[] }[] = [];
    const suggestions: { name: string; voters: string[] }[] = [];

    const dishMap = new Map<string, string[]>();
    const suggestionMap = new Map<string, string[]>();

    votes.forEach((vote) => {
      const voterName = vote.voter.name || vote.voter.email;
      if (vote.dishId && vote.dish) {
        const existing = dishMap.get(vote.dishId);
        if (existing) {
          existing.push(voterName);
        } else {
          dishMap.set(vote.dishId, [voterName]);
        }
      } else if (vote.suggestedDishName) {
        const existing = suggestionMap.get(vote.suggestedDishName);
        if (existing) {
          existing.push(voterName);
        } else {
          suggestionMap.set(vote.suggestedDishName, [voterName]);
        }
      }
    });

    // Convert maps to arrays
    votes.forEach((vote) => {
      if (vote.dishId && vote.dish && dishMap.has(vote.dishId)) {
        dishVotes.push({
          dish: vote.dish,
          voters: dishMap.get(vote.dishId)!,
        });
        dishMap.delete(vote.dishId); // Prevent duplicates
      }
    });

    suggestionMap.forEach((voters, name) => {
      suggestions.push({ name, voters });
    });

    // Sort by vote count
    dishVotes.sort((a, b) => b.voters.length - a.voters.length);
    suggestions.sort((a, b) => b.voters.length - a.voters.length);

    return { dishVotes, suggestions };
  }, [votes]);

  // Fetch dishes
  const fetchDishes = useCallback(async () => {
    setLoadingDishes(true);
    try {
      const response = await fetch("/api/dishes");
      const data = await response.json();
      if (response.ok) {
        setDishes(data.dishes || []);
      }
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    } finally {
      setLoadingDishes(false);
    }
  }, []);

  // Fetch votes
  const fetchVotes = useCallback(async () => {
    setLoadingVotes(true);
    try {
      const response = await fetch("/api/votes");
      const data = await response.json();
      if (response.ok) {
        setVotes(data.votes || []);
      }
    } catch (err) {
      console.error("Failed to fetch votes:", err);
    } finally {
      setLoadingVotes(false);
    }
  }, []);

  // Fetch existing plan for next week
  const fetchExistingPlan = useCallback(async () => {
    setLoadingPlan(true);
    try {
      const weekStr = toDateString(nextWeekStart);
      const response = await fetch(`/api/meal-plans-v2?week=${weekStr}`);
      const data = await response.json();

      if (response.ok && data.plan) {
        const plan: ExistingPlan = data.plan;
        setExistingPlanId(plan.id);
        setWeeklyStaples(plan.weeklyStaples || []);

        // Map existing plan to day plans
        const initialPlans = initializeDayPlans();
        const dayPlanMap: Record<string, DayPlan> = {};
        initialPlans.forEach((dp) => {
          dayPlanMap[dp.dateStr] = dp;
        });

        plan.plannedDays.forEach((plannedDay) => {
          const dateStr = plannedDay.date.split("T")[0];
          if (dayPlanMap[dateStr]) {
            dayPlanMap[dateStr].meals = plannedDay.meals.map((meal) => ({
              id: generateId(),
              mealType: meal.mealType as MealEntry["mealType"],
              notes: meal.notes || "",
              dishes: meal.dishes.map((d) => ({
                id: generateId(),
                dishId: d.dishId,
                dishName: d.dishName,
                isFreeForm: d.isFreeForm,
              })),
            }));
          }
        });

        setDayPlans(Object.values(dayPlanMap).sort((a, b) => a.date.getTime() - b.date.getTime()));
      } else {
        // No existing plan, initialize empty
        setDayPlans(initializeDayPlans());
      }
    } catch (err) {
      console.error("Failed to fetch existing plan:", err);
      setDayPlans(initializeDayPlans());
    } finally {
      setLoadingPlan(false);
    }
  }, [nextWeekStart, initializeDayPlans]);

  // Load data on mount
  useEffect(() => {
    fetchDishes();
    fetchVotes();
    fetchExistingPlan();
  }, [fetchDishes, fetchVotes, fetchExistingPlan]);

  // Add meal to a day
  const addMealToDay = (dayIndex: number, mealType: MealEntry["mealType"] = "DINNER") => {
    setDayPlans((prev) => {
      const newPlans = [...prev];
      newPlans[dayIndex] = {
        ...newPlans[dayIndex],
        meals: [
          ...newPlans[dayIndex].meals,
          {
            id: generateId(),
            mealType,
            notes: "",
            dishes: [],
          },
        ],
      };
      return newPlans;
    });
  };

  // Remove meal from a day
  const removeMealFromDay = (dayIndex: number, mealId: string) => {
    setDayPlans((prev) => {
      const newPlans = [...prev];
      newPlans[dayIndex] = {
        ...newPlans[dayIndex],
        meals: newPlans[dayIndex].meals.filter((m) => m.id !== mealId),
      };
      return newPlans;
    });
  };

  // Add dish to a meal
  const addDishToMeal = (
    dayIndex: number,
    mealId: string,
    dishId: string | null,
    dishName: string
  ) => {
    setDayPlans((prev) => {
      const newPlans = [...prev];
      newPlans[dayIndex] = {
        ...newPlans[dayIndex],
        meals: newPlans[dayIndex].meals.map((meal) => {
          if (meal.id !== mealId) return meal;
          return {
            ...meal,
            dishes: [
              ...meal.dishes,
              {
                id: generateId(),
                dishId,
                dishName,
                isFreeForm: !dishId,
              },
            ],
          };
        }),
      };
      return newPlans;
    });
  };

  // Remove dish from a meal
  const removeDishFromMeal = (dayIndex: number, mealId: string, dishEntryId: string) => {
    setDayPlans((prev) => {
      const newPlans = [...prev];
      newPlans[dayIndex] = {
        ...newPlans[dayIndex],
        meals: newPlans[dayIndex].meals.map((meal) => {
          if (meal.id !== mealId) return meal;
          return {
            ...meal,
            dishes: meal.dishes.filter((d) => d.id !== dishEntryId),
          };
        }),
      };
      return newPlans;
    });
  };

  // Toggle weekly staple
  const toggleStaple = (item: string) => {
    setWeeklyStaples((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Add custom staple
  const addCustomStaple = () => {
    const trimmed = customStaple.trim();
    if (trimmed && !weeklyStaples.includes(trimmed)) {
      setWeeklyStaples((prev) => [...prev, trimmed]);
      setCustomStaple("");
    }
  };

  // Save the plan
  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      const payload = {
        weekStart: toDateString(nextWeekStart),
        weeklyStaples,
        plannedDays: dayPlans
          .filter((day) => day.meals.length > 0)
          .map((day) => ({
            date: day.dateStr,
            meals: day.meals.map((meal) => ({
              mealType: meal.mealType,
              notes: meal.notes || null,
              dishes: meal.dishes.map((d) => ({
                dishId: d.dishId || undefined,
                dishName: d.dishName,
                isFreeForm: d.isFreeForm,
              })),
            })),
          })),
      };

      const response = await fetch("/api/meal-plans-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save meal plan");
      }

      const data = await response.json();
      setExistingPlanId(data.plan?.id || null);
      return data.plan?.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Save and go back
  const handleSaveAndGoBack = async () => {
    try {
      await handleSave();
      router.push("/meals");
    } catch {
      // Error already set in handleSave
    }
  };

  // Get AI Feedback
  const handleGetFeedback = async () => {
    setFeedbackError(null);
    setLoadingFeedback(true);

    try {
      // First, save the plan to get/update the planId
      let planId = existingPlanId;
      if (!planId) {
        planId = await handleSave();
      } else {
        await handleSave();
      }

      if (!planId) {
        throw new Error("Failed to save plan before getting feedback");
      }

      // Now fetch feedback
      const response = await fetch("/api/meal-plans-v2/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          language: locale,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get feedback");
      }

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Meal type label
  const mealTypeLabel = (type: MealEntry["mealType"]): string => {
    switch (type) {
      case "BREAKFAST":
        return t("breakfast");
      case "LUNCH":
        return t("lunch");
      case "DINNER":
        return t("dinner");
      case "SNACK":
        return t("snack");
    }
  };

  // Format date for display
  const formatDate = (date: Date, dayIndex: number) => {
    const month = date.toLocaleDateString(undefined, { month: "short" });
    const day = date.getDate();
    return `${dayNames[dayIndex]} ${month} ${day}`;
  };

  // Week end date
  const weekEnd = useMemo(() => {
    const end = new Date(nextWeekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [nextWeekStart]);

  // Week range text
  const weekRangeText = useMemo(() => {
    const startMonth = nextWeekStart.toLocaleDateString(undefined, { month: "short" });
    const endMonth = weekEnd.toLocaleDateString(undefined, { month: "short" });
    const startDay = nextWeekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }, [nextWeekStart, weekEnd]);

  // Get status icon for feedback breakdown
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

  // Get category label for feedback
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

  // Check if plan has any dishes
  const hasDishes = dayPlans.some((day) =>
    day.meals.some((meal) => meal.dishes.length > 0)
  );

  const hasVotes = groupedVotes.dishVotes.length > 0 || groupedVotes.suggestions.length > 0;
  const isLoading = loadingPlan || loadingDishes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/meals"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{t("planNextWeek")}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-8">{weekRangeText}</p>
        </div>
        <button
          onClick={handleSaveAndGoBack}
          disabled={saving || isLoading}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
        >
          {saving ? tCommon("saving") : t("savePlan")}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-gray-500">{tCommon("loading")}</span>
        </div>
      ) : (
        <>
          {/* Step 1: Vote Results */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button
              onClick={() => setShowVotes(!showVotes)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">1</span>
                <div className="text-left">
                  <h2 className="font-semibold text-gray-900">{t("voteResults")}</h2>
                  <p className="text-sm text-gray-500">
                    {loadingVotes ? tCommon("loading") : hasVotes ? `${votes.length} ${t("votes")}` : t("noVotesYet")}
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showVotes ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showVotes && (
              <div className="px-6 pb-6 border-t">
                {loadingVotes ? (
                  <div className="py-4 text-center text-gray-500">{tCommon("loading")}</div>
                ) : !hasVotes ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">{t("noVotesYet")}</p>
                    <Link href="/meals/vote" className="text-orange-600 hover:text-orange-700 text-sm mt-2 inline-block">
                      {t("goToVote")} →
                    </Link>
                  </div>
                ) : (
                  <div className="pt-4 space-y-4">
                    {/* Dish votes */}
                    {groupedVotes.dishVotes.map(({ dish, voters }) => (
                      <div
                        key={dish!.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        {dish!.photoUrl && (
                          <Image
                            src={dish!.photoUrl}
                            alt={dish!.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{dish!.name}</h3>
                          <p className="text-sm text-gray-500">
                            {voters.join(", ")}
                          </p>
                        </div>
                        <div className="text-lg font-bold text-orange-500">
                          {voters.length}
                        </div>
                      </div>
                    ))}

                    {/* Suggestions */}
                    {groupedVotes.suggestions.length > 0 && (
                      <>
                        <h3 className="text-sm font-medium text-gray-500 mt-4">{t("suggestedDishes")}</h3>
                        {groupedVotes.suggestions.map(({ name, voters }) => (
                          <div
                            key={name}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xl">
                              ✨
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{name}</h3>
                              <p className="text-sm text-gray-500">
                                {voters.join(", ")}
                              </p>
                            </div>
                            <div className="text-lg font-bold text-orange-500">
                              {voters.length}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Weekly Staples */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">2</span>
              <div>
                <h2 className="font-semibold text-gray-900">Weekly Staples</h2>
                <p className="text-sm text-gray-500">Items consumed daily (auto-added to daily logs)</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_STAPLES.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleStaple(item)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    weeklyStaples.includes(item)
                      ? "bg-orange-100 text-orange-700 border border-orange-300"
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Custom staples */}
            {weeklyStaples.filter((s) => !COMMON_STAPLES.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {weeklyStaples
                  .filter((s) => !COMMON_STAPLES.includes(s))
                  .map((item) => (
                    <button
                      key={item}
                      onClick={() => toggleStaple(item)}
                      className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-700 border border-orange-300"
                    >
                      {item} &times;
                    </button>
                  ))}
              </div>
            )}

            {/* Add custom staple */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customStaple}
                onChange={(e) => setCustomStaple(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomStaple()}
                placeholder="Add custom item..."
                className="flex-1 px-3 py-1.5 border rounded-md text-sm"
              />
              <button
                onClick={addCustomStaple}
                disabled={!customStaple.trim()}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                {tCommon("add")}
              </button>
            </div>
          </div>

          {/* Step 3: Day Plans */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">3</span>
              <div>
                <h2 className="font-semibold text-gray-900">{t("planMeals")}</h2>
                <p className="text-sm text-gray-500">Add meals for each day</p>
              </div>
            </div>

            <div className="space-y-4">
              {dayPlans.map((dayPlan, dayIndex) => (
                <DayPlanCard
                  key={dayPlan.dateStr}
                  dayPlan={dayPlan}
                  dayIndex={dayIndex}
                  dayLabel={formatDate(dayPlan.date, dayIndex)}
                  dishes={dishesWithVotes}
                  loadingDishes={loadingDishes}
                  mealTypeLabel={mealTypeLabel}
                  onAddMeal={(mealType) => addMealToDay(dayIndex, mealType)}
                  onRemoveMeal={(mealId) => removeMealFromDay(dayIndex, mealId)}
                  onAddDish={(mealId, dishId, dishName) =>
                    addDishToMeal(dayIndex, mealId, dishId, dishName)
                  }
                  onRemoveDish={(mealId, dishEntryId) =>
                    removeDishFromMeal(dayIndex, mealId, dishEntryId)
                  }
                />
              ))}
            </div>
          </div>

          {/* Step 4: AI Feedback */}
          {hasDishes && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">4</span>
                  <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>🍎</span> {t("healthFeedback")}
                    </h2>
                    <p className="text-sm text-gray-500">Get AI-powered nutrition analysis</p>
                  </div>
                </div>
                {!loadingFeedback && (
                  <button
                    onClick={handleGetFeedback}
                    disabled={saving}
                    className="text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50"
                  >
                    {feedback ? t("refreshFeedback") : t("getFeedback")}
                  </button>
                )}
              </div>

              {/* Loading state */}
              {loadingFeedback && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                    <span className="text-gray-600">{t("analyzingMealPlan")}</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {feedbackError && !loadingFeedback && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-red-600 mb-3">{feedbackError}</p>
                  <button
                    onClick={handleGetFeedback}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                  >
                    {t("retry")}
                  </button>
                </div>
              )}

              {/* Feedback content */}
              {feedback && !loadingFeedback && !feedbackError && (
                <div className="bg-gray-50 rounded-lg divide-y">
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

                  {/* Missing ingredients notice */}
                  {feedback.missingIngredientsDishes.length > 0 && (
                    <div className="p-4 bg-gray-100">
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-500">ℹ</span>
                        {t("feedbackMissingIngredients", {
                          count: feedback.missingIngredientsDishes.length,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Initial prompt */}
              {!feedback && !loadingFeedback && !feedbackError && (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-500 mb-3">{t("feedbackPrompt")}</p>
                  <button
                    onClick={handleGetFeedback}
                    disabled={saving}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                  >
                    {t("getFeedback")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom save button */}
          <div className="flex justify-end gap-3">
            <Link
              href="/meals"
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {tCommon("cancel")}
            </Link>
            <button
              onClick={handleSaveAndGoBack}
              disabled={saving || isLoading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
            >
              {saving ? tCommon("saving") : t("savePlan")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Sub-component for day plan card
type DayPlanCardProps = {
  dayPlan: DayPlan;
  dayIndex: number;
  dayLabel: string;
  dishes: DishWithVotes[];
  loadingDishes: boolean;
  mealTypeLabel: (type: MealEntry["mealType"]) => string;
  onAddMeal: (mealType: MealEntry["mealType"]) => void;
  onRemoveMeal: (mealId: string) => void;
  onAddDish: (mealId: string, dishId: string | null, dishName: string) => void;
  onRemoveDish: (mealId: string, dishEntryId: string) => void;
};

function DayPlanCard({
  dayPlan,
  dayLabel,
  dishes,
  loadingDishes,
  mealTypeLabel,
  onAddMeal,
  onRemoveMeal,
  onAddDish,
  onRemoveDish,
}: DayPlanCardProps) {
  // Check which meal types are already added
  const addedMealTypes = dayPlan.meals.map((m) => m.mealType);
  const availableMealTypes: MealEntry["mealType"][] = (
    ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const
  ).filter((type) => !addedMealTypes.includes(type));

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Day header */}
      <div className="bg-gray-50 px-4 py-2 border-b">
        <h4 className="font-semibold text-gray-800">{dayLabel}</h4>
      </div>

      <div className="p-4 space-y-3">
        {/* Meals */}
        {dayPlan.meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            dishes={dishes}
            loadingDishes={loadingDishes}
            mealTypeLabel={mealTypeLabel(meal.mealType)}
            onRemoveMeal={() => onRemoveMeal(meal.id)}
            onAddDish={(dishId, dishName) => onAddDish(meal.id, dishId, dishName)}
            onRemoveDish={(dishEntryId) => onRemoveDish(meal.id, dishEntryId)}
          />
        ))}

        {/* Add meal buttons */}
        {availableMealTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableMealTypes.map((type) => (
              <button
                key={type}
                onClick={() => onAddMeal(type)}
                className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-orange-400 hover:text-orange-600 transition"
              >
                + {mealTypeLabel(type)}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {dayPlan.meals.length === 0 && availableMealTypes.length === 4 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No meals planned</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for meal card within a day
type MealCardProps = {
  meal: MealEntry;
  dishes: DishWithVotes[];
  loadingDishes: boolean;
  mealTypeLabel: string;
  onRemoveMeal: () => void;
  onAddDish: (dishId: string | null, dishName: string) => void;
  onRemoveDish: (dishEntryId: string) => void;
};

function MealCard({
  meal,
  dishes,
  loadingDishes,
  mealTypeLabel,
  onRemoveMeal,
  onAddDish,
  onRemoveDish,
}: MealCardProps) {
  const [showDishSelector, setShowDishSelector] = useState(false);
  const [freeFormDish, setFreeFormDish] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter dishes based on search
  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDish = (dish: DishWithVotes) => {
    onAddDish(dish.id, dish.name);
    setShowDishSelector(false);
    setSearchQuery("");
  };

  const handleAddFreeForm = () => {
    const trimmed = freeFormDish.trim();
    if (trimmed) {
      onAddDish(null, trimmed);
      setFreeFormDish("");
      setShowDishSelector(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-white space-y-2">
      {/* Meal header */}
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-gray-700 text-sm">{mealTypeLabel}</h5>
        <button onClick={onRemoveMeal} className="text-gray-400 hover:text-red-500 text-sm">
          Remove
        </button>
      </div>

      {/* Dish list */}
      {meal.dishes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {meal.dishes.map((dish) => (
            <div
              key={dish.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                dish.isFreeForm
                  ? "bg-gray-100 text-gray-700 border border-gray-200"
                  : "bg-orange-50 text-orange-700 border border-orange-200"
              }`}
            >
              <span>{dish.dishName}</span>
              <button onClick={() => onRemoveDish(dish.id)} className="text-gray-400 hover:text-red-500">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add dish */}
      {!showDishSelector ? (
        <button
          onClick={() => setShowDishSelector(true)}
          className="text-sm text-orange-600 hover:text-orange-800"
        >
          + Add dish
        </button>
      ) : (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes..."
            className="w-full px-3 py-2 border rounded-md text-sm"
          />

          {/* Dish list with vote counts */}
          {loadingDishes ? (
            <div className="text-sm text-gray-500">Loading dishes...</div>
          ) : filteredDishes.length > 0 ? (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredDishes.map((dish) => (
                <button
                  key={dish.id}
                  onClick={() => handleSelectDish(dish)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 rounded-md flex items-center gap-2"
                >
                  {dish.photoUrl && (
                    <Image
                      src={dish.photoUrl}
                      alt={dish.name}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded object-cover"
                    />
                  )}
                  <span className="flex-1">{dish.name}</span>
                  {dish.voteCount > 0 && (
                    <span className="flex items-center gap-1 text-yellow-600 text-xs">
                      <span>⭐</span>
                      <span>{dish.voteCount}</span>
                      {dish.voters.length > 0 && (
                        <span className="text-gray-400 ml-1">({dish.voters.join(", ")})</span>
                      )}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-2">No matching dishes</div>
          )}

          {/* Or add free-form */}
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-gray-500 mb-1">Or type a custom dish:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={freeFormDish}
                onChange={(e) => setFreeFormDish(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFreeForm()}
                placeholder="Custom dish name..."
                className="flex-1 px-3 py-1.5 border rounded-md text-sm"
              />
              <button
                onClick={handleAddFreeForm}
                disabled={!freeFormDish.trim()}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Cancel */}
          <button
            onClick={() => {
              setShowDishSelector(false);
              setSearchQuery("");
              setFreeFormDish("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

