"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Chore = {
  id: string;
  title: string;
  icon: string | null;
  defaultPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
};

type ChoreFormProps = {
  chore?: Chore | null;
  onClose: () => void;
  onSuccess: (chore: Chore) => void;
};

// Common emoji icons for chores
const commonIcons = [
  "🧹", "🍽️", "🛏️", "👕", "🗑️", "🐕", "🌱", "📚",
  "🧺", "🚿", "🍳", "🧽", "🪣", "✨", "🧼", "🪥",
  "🚗", "📦", "🤝", "⭐", "🎯", "💪", "🏆", "🎨",
];

export default function ChoreForm({ chore, onClose, onSuccess }: ChoreFormProps) {
  const [title, setTitle] = useState(chore?.title || "");
  const [icon, setIcon] = useState(chore?.icon || "");
  const [defaultPoints, setDefaultPoints] = useState(
    chore?.defaultPoints?.toString() || ""
  );
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (chore) {
      setTitle(chore.title);
      setIcon(chore.icon || "");
      setDefaultPoints(chore.defaultPoints.toString());
    }
  }, [chore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const points = parseInt(defaultPoints);
    if (isNaN(points) || points < 0) {
      setError(t("pointsNonNegative"));
      return;
    }

    setLoading(true);

    try {
      const url = chore ? `/api/chores/${chore.id}` : "/api/chores";
      const method = chore ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          icon: icon || null,
          defaultPoints: points,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tCommon("error"));
        setLoading(false);
        return;
      }

      onSuccess(data.chore);
    } catch {
      setError(tCommon("error"));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {chore ? t("editChore") : t("addChoreTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("choreName")}
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Wash dishes, Take out trash"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("iconLabel")}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-14 h-14 text-3xl border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center"
              >
                {icon || "➕"}
              </button>
              {icon && (
                <button
                  type="button"
                  onClick={() => setIcon("")}
                  className="text-sm text-gray-500 hover:text-red-500"
                >
                  {t("clear")}
                </button>
              )}
              <span className="text-sm text-gray-500 ml-2">
                {icon ? t("clickToChange") : t("clickToPick")}
              </span>
            </div>

            {showIconPicker && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-8 gap-2">
                  {commonIcons.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setIcon(emoji);
                        setShowIconPicker(false);
                      }}
                      className={`text-2xl p-2 rounded hover:bg-blue-100 transition-colors ${
                        icon === emoji ? "bg-blue-200" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="block text-xs text-gray-500 mb-1">
                    {t("orTypeEmoji")}
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="Type or paste an emoji"
                    className="w-full px-2 py-1 text-lg border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    maxLength={4}
                  />
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t("iconHelp")}
            </p>
          </div>

          <div>
            <label
              htmlFor="defaultPoints"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("defaultPoints")}
            </label>
            <input
              id="defaultPoints"
              type="number"
              required
              min="0"
              value={defaultPoints}
              onChange={(e) => setDefaultPoints(e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              {t("pointsAwarded")}
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("saving") : chore ? t("update") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
