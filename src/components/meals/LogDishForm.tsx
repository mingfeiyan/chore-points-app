"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
};

type Parent = {
  id: string;
  name: string | null;
  email: string;
};

type Meal = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER";
  date: string;
  dish: Dish;
  cookedBy: { id: string; name: string | null; email: string } | null;
};

type LogDishFormProps = {
  meal?: Meal | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function LogDishForm({ meal, onClose, onSuccess }: LogDishFormProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const isEditMode = !!meal;

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(meal?.dish || null);
  const [isNewDish, setIsNewDish] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [mealType, setMealType] = useState<"BREAKFAST" | "LUNCH" | "DINNER">(meal?.mealType || "DINNER");
  const [date, setDate] = useState("");
  const [cookedById, setCookedById] = useState<string>(meal?.cookedBy?.id || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Set date on client side to use local timezone
    if (meal) {
      // For edit mode, parse existing date
      const mealDate = new Date(meal.date);
      setDate(`${mealDate.getFullYear()}-${String(mealDate.getMonth() + 1).padStart(2, '0')}-${String(mealDate.getDate()).padStart(2, '0')}`);
    } else {
      const today = new Date();
      setDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    }
    fetchDishes();
    fetchParents();
  }, [meal]);

  const fetchDishes = async () => {
    try {
      const response = await fetch("/api/dishes");
      const data = await response.json();
      if (response.ok) {
        setDishes(data.dishes);
      }
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    }
  };

  const fetchParents = async () => {
    try {
      const response = await fetch("/api/family/parents");
      const data = await response.json();
      if (response.ok) {
        setParents(data.parents);
      }
    } catch (err) {
      console.error("Failed to fetch parents:", err);
    }
  };

  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File too large (max 5MB)");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    const formData = new FormData();
    formData.append("file", photoFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload photo");
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Edit mode - only update mealType, date, cookedById
      if (isEditMode && meal) {
        const response = await fetch(`/api/meals/${meal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mealType,
            date,
            cookedById: cookedById || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update meal");
        }

        onSuccess();
        return;
      }

      // Create mode
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      // For new dish, photo is required
      if (isNewDish && !photoUrl) {
        setError(t("photoRequired"));
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        mealType,
        date,
        cookedById: cookedById || undefined,
      };

      if (isNewDish) {
        body.newDish = {
          name: newDishName,
          photoUrl,
        };
      } else if (selectedDish) {
        body.dishId = selectedDish.id;
      } else {
        setError("Please select a dish or add a new one");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to log meal");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? t("editMeal") : t("logDish")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dish Display (read-only in edit mode) */}
            {isEditMode && meal ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("dishName")}
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                  <img
                    src={meal.dish.photoUrl}
                    alt={meal.dish.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <span className="font-medium text-gray-900">{meal.dish.name}</span>
                </div>
              </div>
            ) : !isNewDish ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("selectExisting")}
                </label>
                <input
                  type="text"
                  placeholder={t("searchDishes")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md mb-2"
                />
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredDishes.length === 0 ? (
                    <div className="p-3 text-gray-500 text-sm">
                      {t("noMatchingDishes")}
                    </div>
                  ) : (
                    filteredDishes.map((dish) => (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => setSelectedDish(dish)}
                        className={`w-full p-2 text-left flex items-center gap-2 hover:bg-gray-50 ${
                          selectedDish?.id === dish.id ? "bg-orange-50 border-l-2 border-orange-500" : ""
                        }`}
                      >
                        <img
                          src={dish.photoUrl}
                          alt={dish.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                        <span className="text-sm">{dish.name}</span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewDish(true)}
                  className="mt-2 text-sm text-orange-600 hover:text-orange-700"
                >
                  + {t("orAddNew")}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("dishName")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewDish(false);
                      setNewDishName("");
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {t("selectExisting")}
                  </button>
                </div>
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder={t("dishNamePlaceholder")}
                  className="w-full px-3 py-2 border rounded-md"
                  required={isNewDish}
                />
              </div>
            )}

            {/* Photo Upload (required for new, optional for existing, hidden in edit mode) */}
            {!isEditMode && <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("photo")} {isNewDish ? `(${t("photoRequired")})` : `(${t("photoOptional")})`}
              </label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block w-full p-4 border-2 border-dashed rounded-md text-center cursor-pointer hover:border-orange-500">
                  <span className="text-gray-500">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>}

            {/* Meal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("mealType")}
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as "BREAKFAST" | "LUNCH" | "DINNER")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="BREAKFAST">{t("breakfast")}</option>
                <option value="LUNCH">{t("lunch")}</option>
                <option value="DINNER">{t("dinner")}</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("date")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full max-w-full box-border px-3 py-2 border rounded-md"
              />
            </div>

            {/* Cooked By */}
            {parents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("selectCook")}
                </label>
                <select
                  value={cookedById}
                  onChange={(e) => setCookedById(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">--</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name || parent.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? t("logging") : t("logMeal")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
