"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

// Types for dish library
type Dish = {
  id: string;
  name: string;
  photoUrl: string;
};

// Types for meal entry form
type MealDishEntry = {
  id: string; // client-side unique key
  dishId: string | null;
  dishName: string;
  isFreeForm: boolean;
};

type MealEntry = {
  id: string; // client-side unique key
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  notes: string;
  dishes: MealDishEntry[];
};

// Type for fetched daily meal log
type DailyMealLog = {
  id: string;
  date: string;
  notes: string | null;
  meals: {
    id: string;
    mealType: string;
    notes: string | null;
    dishes: {
      id: string;
      dishId: string | null;
      dishName: string;
      isFreeForm: boolean;
      dish: { id: string; name: string; photoUrl: string } | null;
    }[];
  }[];
  dailyItems: { id: string; name: string }[];
};

type DayDetailModalProps = {
  date: Date;
  onClose: () => void;
  onSave: () => void;
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

// Common daily items
const COMMON_DAILY_ITEMS = ["fruit", "milk", "vitamin", "eggs", "yogurt"];

export default function DayDetailModal({ date, onClose, onSave }: DayDetailModalProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  // State for dish library
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(true);

  // State for form data
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [dailyItems, setDailyItems] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Format date for header display
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Fetch dish library
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

  // Fetch existing data for the day
  const fetchDayData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = toDateString(date);
      const response = await fetch(`/api/daily-meals?start=${dateStr}&end=${dateStr}`);
      const data = await response.json();

      if (response.ok && data.logs && data.logs.length > 0) {
        const log: DailyMealLog = data.logs[0];

        // Convert to form state
        setMeals(
          log.meals.map((meal) => ({
            id: generateId(),
            mealType: meal.mealType as MealEntry["mealType"],
            notes: meal.notes || "",
            dishes: meal.dishes.map((d) => ({
              id: generateId(),
              dishId: d.dishId,
              dishName: d.dishName,
              isFreeForm: d.isFreeForm,
            })),
          }))
        );
        setDailyItems(log.dailyItems.map((item) => item.name));
        setNotes(log.notes || "");
      } else {
        // No existing data - initialize with empty state
        setMeals([]);
        setDailyItems([]);
        setNotes("");
      }
    } catch (err) {
      console.error("Failed to fetch day data:", err);
      setError("Failed to load day data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  // Load data on mount
  useEffect(() => {
    fetchDishes();
    fetchDayData();
  }, [fetchDishes, fetchDayData]);

  // Add a new meal
  const addMeal = (mealType: MealEntry["mealType"]) => {
    setMeals((prev) => [
      ...prev,
      {
        id: generateId(),
        mealType,
        notes: "",
        dishes: [],
      },
    ]);
  };

  // Remove a meal
  const removeMeal = (mealId: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  };

  // Add a dish to a meal
  const addDishToMeal = (mealId: string, dishId: string | null, dishName: string) => {
    setMeals((prev) =>
      prev.map((meal) => {
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
      })
    );
  };

  // Remove a dish from a meal
  const removeDishFromMeal = (mealId: string, dishEntryId: string) => {
    setMeals((prev) =>
      prev.map((meal) => {
        if (meal.id !== mealId) return meal;
        return {
          ...meal,
          dishes: meal.dishes.filter((d) => d.id !== dishEntryId),
        };
      })
    );
  };

  // Toggle daily item
  const toggleDailyItem = (item: string) => {
    setDailyItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Add custom daily item
  const [customDailyItem, setCustomDailyItem] = useState("");
  const addCustomDailyItem = () => {
    const trimmed = customDailyItem.trim();
    if (trimmed && !dailyItems.includes(trimmed)) {
      setDailyItems((prev) => [...prev, trimmed]);
      setCustomDailyItem("");
    }
  };

  // Handle save
  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      const payload = {
        date: toDateString(date),
        meals: meals.map((meal) => ({
          mealType: meal.mealType,
          notes: meal.notes || null,
          dishes: meal.dishes.map((d) => ({
            dishId: d.dishId || undefined,
            dishName: d.dishName,
            isFreeForm: d.isFreeForm,
          })),
        })),
        dailyItems,
        notes: notes || null,
      };

      const response = await fetch("/api/daily-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Meal type labels
  const mealTypeLabel = (type: MealEntry["mealType"]): string => {
    switch (type) {
      case "BREAKFAST":
        return t("breakfast");
      case "LUNCH":
        return t("lunch");
      case "DINNER":
        return t("dinner");
      case "SNACK":
        return "Snack"; // Add to translations later
      default:
        return type.toLowerCase();
    }
  };

  // Check which meal types are already added
  const addedMealTypes = meals.map((m) => m.mealType);
  const availableMealTypes: MealEntry["mealType"][] = (
    ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const
  ).filter((type) => !addedMealTypes.includes(type));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-lg border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className="ml-3 text-gray-500">{tCommon("loading")}</span>
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Meals section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Meals</h3>

                {meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    dishes={dishes}
                    loadingDishes={loadingDishes}
                    mealTypeLabel={mealTypeLabel(meal.mealType)}
                    onRemoveMeal={() => removeMeal(meal.id)}
                    onAddDish={(dishId, dishName) =>
                      addDishToMeal(meal.id, dishId, dishName)
                    }
                    onRemoveDish={(dishEntryId) =>
                      removeDishFromMeal(meal.id, dishEntryId)
                    }
                  />
                ))}

                {/* Add meal button */}
                {availableMealTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availableMealTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => addMeal(type)}
                        className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-orange-400 hover:text-orange-600 transition"
                      >
                        + {mealTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily items section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Daily Items</h3>
                <div className="flex flex-wrap gap-2">
                  {COMMON_DAILY_ITEMS.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggleDailyItem(item)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        dailyItems.includes(item)
                          ? "bg-orange-100 text-orange-700 border border-orange-300"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {/* Custom daily item input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDailyItem}
                    onChange={(e) => setCustomDailyItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomDailyItem()}
                    placeholder="Add custom item..."
                    className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                  />
                  <button
                    onClick={addCustomDailyItem}
                    disabled={!customDailyItem.trim()}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    {tCommon("add")}
                  </button>
                </div>
                {/* Show non-common daily items that are selected */}
                {dailyItems.filter((item) => !COMMON_DAILY_ITEMS.includes(item)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dailyItems
                      .filter((item) => !COMMON_DAILY_ITEMS.includes(item))
                      .map((item) => (
                        <button
                          key={item}
                          onClick={() => toggleDailyItem(item)}
                          className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-700 border border-orange-300"
                        >
                          {item} &times;
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Notes section */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for the day..."
                  className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-lg border-t px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? tCommon("saving") : tCommon("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for meal card
type MealCardProps = {
  meal: MealEntry;
  dishes: Dish[];
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

  const handleSelectDish = (dish: Dish) => {
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
    <div className="border rounded-lg p-4 space-y-3">
      {/* Meal header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-800">{mealTypeLabel}</h4>
        <button
          onClick={onRemoveMeal}
          className="text-gray-400 hover:text-red-500 text-sm"
        >
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
              <button
                onClick={() => onRemoveDish(dish.id)}
                className="text-gray-400 hover:text-red-500"
              >
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
          {/* Search/select from library */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes..."
            className="w-full px-3 py-2 border rounded-md text-sm"
          />

          {/* Dish list */}
          {loadingDishes ? (
            <div className="text-sm text-gray-500">Loading dishes...</div>
          ) : filteredDishes.length > 0 ? (
            <div className="max-h-32 overflow-y-auto space-y-1">
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
                  <span>{dish.name}</span>
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
