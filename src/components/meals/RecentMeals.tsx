"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LogDishForm from "./LogDishForm";

type Meal = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER";
  date: string;
  dish: {
    id: string;
    name: string;
    photoUrl: string;
  };
  loggedBy: {
    name: string | null;
    email: string;
  };
  cookedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export default function RecentMeals() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await fetch("/api/meals?days=7");
      const data = await response.json();
      if (response.ok) {
        setMeals(data.meals);
      }
    } catch (err) {
      console.error("Failed to fetch meals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingMeal(null);
    fetchMeals();
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
  };

  const mealTypeLabel = (type: string) => {
    switch (type) {
      case "BREAKFAST":
        return t("breakfast");
      case "LUNCH":
        return t("lunch");
      case "DINNER":
        return t("dinner");
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
        >
          + {t("logDish")}
        </button>
        <Link
          href="/meals/vote"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("vote")}
        </Link>
        <Link
          href="/meals/results"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("results")}
        </Link>
      </div>

      {/* Recent Dishes */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t("recentDishes")}</h2>

      {meals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">{t("noDishesYet")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            {t("logFirstDish")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
            >
              <img
                src={meal.dish.photoUrl}
                alt={meal.dish.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{meal.dish.name}</h3>
                <p className="text-sm text-gray-500">
                  {mealTypeLabel(meal.mealType)} •{" "}
                  {new Date(meal.date).toLocaleDateString()}
                  {meal.cookedBy && (
                    <> • {t("cookedBy")}: {meal.cookedBy.name || meal.cookedBy.email}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleEdit(meal)}
                className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                title={t("edit")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LogDishForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
      )}

      {editingMeal && (
        <LogDishForm
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
