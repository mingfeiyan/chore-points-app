"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import IngredientsInput from "./IngredientsInput";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
  ingredients: string[];
};

export default function DishLibrary() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchDishes = useCallback(async () => {
    try {
      const response = await fetch("/api/dishes");
      const data = await response.json();
      if (response.ok) {
        setDishes(data.dishes || []);
      }
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const handleDishSaved = (dish: Dish) => {
    if (editingDish) {
      setDishes((prev) => prev.map((d) => (d.id === dish.id ? dish : d)));
      setEditingDish(null);
    } else {
      setDishes((prev) => [dish, ...prev]);
      setShowCreateModal(false);
    }
  };

  const handleDishDeleted = (dishId: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    setEditingDish(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-500">{tCommon("loading")}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t("dishLibrary")}</h2>
          <p className="text-sm text-gray-500">{t("dishLibraryDesc")}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
        >
          + {t("addNewDish")}
        </button>
      </div>

      {dishes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">{t("noDishesInLibrary")}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            + {t("addNewDish")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {dishes.map((dish) => (
            <button
              key={dish.id}
              onClick={() => setEditingDish(dish)}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow text-left"
            >
              <div className="h-32 sm:h-40 overflow-hidden bg-gray-200">
                <Image
                  src={dish.photoUrl}
                  alt={dish.name}
                  width={300}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-gray-900 truncate">{dish.name}</h3>
                {dish.ingredients.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("ingredientCount", { count: dish.ingredients.length })}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDish) && (
        <DishModal
          dish={editingDish}
          onClose={() => {
            setShowCreateModal(false);
            setEditingDish(null);
          }}
          onSave={handleDishSaved}
          onDelete={handleDishDeleted}
        />
      )}
    </div>
  );
}

// Create/Edit Modal
type DishModalProps = {
  dish: Dish | null;
  onClose: () => void;
  onSave: (dish: Dish) => void;
  onDelete: (dishId: string) => void;
};

function DishModal({ dish, onClose, onSave, onDelete }: DishModalProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const isEdit = !!dish;

  const [name, setName] = useState(dish?.name || "");
  const [ingredients, setIngredients] = useState<string[]>(dish?.ingredients || []);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Clean up blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File too large (max 5MB)");
        return;
      }
      setError("");
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile) throw new Error("No photo file");
    const formData = new FormData();
    formData.append("file", photoFile);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload photo");
    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    if (!isEdit && !photoFile) {
      setError(t("photoRequired"));
      return;
    }

    setSaving(true);
    try {
      let photoUrl = dish?.photoUrl;

      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      if (isEdit && dish) {
        // Update existing dish
        const response = await fetch(`/api/dishes/${dish.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, ingredients, photoUrl }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update dish");
        }
        const data = await response.json();
        onSave(data.dish);
      } else {
        // Create new dish
        const response = await fetch("/api/dishes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, photoUrl, ingredients }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create dish");
        }
        const data = await response.json();
        onSave(data.dish);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dish) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/dishes/${dish.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete dish");
      }
      onDelete(dish.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? t("editDish") : t("createDish")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("photo")} {!isEdit && `(${t("photoRequired")})`}
              </label>
              {photoPreview || dish?.photoUrl ? (
                <div className="relative inline-block">
                  <img
                    src={photoPreview || dish?.photoUrl}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-md"
                  />
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      &times;
                    </button>
                  )}
                  <label className="absolute bottom-2 right-2 bg-white/90 text-gray-700 rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-white shadow-sm">
                    {t("changePhoto")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="block w-full p-8 border-2 border-dashed rounded-md text-center cursor-pointer hover:border-orange-500">
                  <span className="text-gray-500">{t("clickToUploadPhoto")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("dishName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("dishNamePlaceholder")}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            {/* Ingredients */}
            <IngredientsInput
              value={ingredients}
              onChange={setIngredients}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                >
                  {t("deleteDish")}
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? tCommon("saving") : tCommon("save")}
              </button>
            </div>
          </form>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 mb-3">{t("confirmDeleteDish")}</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 border rounded-md text-gray-700 text-sm hover:bg-gray-50"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "..." : tCommon("delete")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
