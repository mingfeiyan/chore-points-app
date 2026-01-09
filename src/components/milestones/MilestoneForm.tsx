"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  date: string;
  imageUrl: string | null;
  kid: Kid;
  createdBy: { name: string | null; email: string };
  createdAt: string;
};

type MilestoneFormProps = {
  milestone?: Milestone | null;
  kids: Kid[];
  onClose: () => void;
  onSuccess: (milestone: Milestone) => void;
};

// Milestone-specific icons (life events, achievements, firsts)
const milestoneIconCategories = {
  "Baby": ["👶", "🍼", "🧒", "👧", "👦", "🧒🏻", "🩲", "🧷", "🛁", "🧸", "🎒"],
  "Achievements": ["🏆", "🎖️", "🥇", "🥈", "🥉", "⭐", "🌟", "💫", "✨", "🎯"],
  "Firsts": ["🎂", "🦷", "👣", "🗣️", "✍️", "📖", "🎓", "💼", "🚶", "🏠"],
  "Sports": ["🚴", "🏊", "⚽", "🏀", "⚾", "🎾", "🏃", "🤸", "⛷️", "🛹", "🏄"],
  "Arts": ["🎨", "🎵", "🎹", "🎸", "🎤", "🎭", "💃", "🩰", "📸", "🎬"],
  "Learning": ["📚", "🔬", "🧮", "🌍", "🖥️", "🧩", "♟️", "🎲"],
  "Nature": ["🏕️", "🥾", "🎣", "🌲", "🦋", "🐛", "🌻", "🍀"],
  "Travel": ["✈️", "🚂", "🚗", "⛵", "🏖️", "🏔️", "🗽", "🎢"],
  "Social": ["🤝", "👫", "🎉", "🎊", "🎁", "💝", "📬", "📞"],
  "Health": ["💪", "🧘", "🥗", "😴", "🩺", "💊", "🦴", "❤️"],
};

export default function MilestoneForm({ milestone, kids, onClose, onSuccess }: MilestoneFormProps) {
  const [title, setTitle] = useState(milestone?.title || "");
  const [description, setDescription] = useState(milestone?.description || "");
  const [icon, setIcon] = useState(milestone?.icon || "");
  const [date, setDate] = useState(
    milestone?.date
      ? new Date(milestone.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [imageUrl, setImageUrl] = useState(milestone?.imageUrl || "");
  const [kidId, setKidId] = useState(milestone?.kid?.id || (kids.length === 1 ? kids[0].id : ""));
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations("milestones");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description || "");
      setIcon(milestone.icon || "");
      setDate(new Date(milestone.date).toISOString().split("T")[0]);
      setImageUrl(milestone.imageUrl || "");
      setKidId(milestone.kid.id);
    }
  }, [milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!kidId) {
      setError(t("selectKid"));
      return;
    }

    setLoading(true);

    try {
      const url = milestone ? `/api/milestones/${milestone.id}` : "/api/milestones";
      const method = milestone ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          icon: icon || null,
          date,
          imageUrl: imageUrl || null,
          kidId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tCommon("error"));
        setLoading(false);
        return;
      }

      onSuccess(data.milestone);
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
            {milestone ? t("editMilestone") : t("addMilestone")}
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

          {/* Kid Selector */}
          {kids.length > 1 && (
            <div>
              <label
                htmlFor="kidId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("selectChild")}
              </label>
              <select
                id="kidId"
                value={kidId}
                onChange={(e) => setKidId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t("chooseChild")}</option>
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.name || kid.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("milestoneTitle")}
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Icon Picker */}
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
            </div>

            {showIconPicker && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                {Object.entries(milestoneIconCategories).map(([category, icons]) => (
                  <div key={category} className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {category}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {icons.map((emoji, idx) => (
                        <button
                          key={`${category}-${emoji}-${idx}`}
                          type="button"
                          onClick={() => {
                            setIcon(emoji);
                            setShowIconPicker(false);
                          }}
                          className={`text-2xl p-1.5 rounded hover:bg-blue-100 transition-colors ${
                            icon === emoji ? "bg-blue-200" : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("date")}
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("description")}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Image URL */}
          <div>
            <label
              htmlFor="imageUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("imageUrl")}
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t("imageUrlPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("imageUrlHelp")}
            </p>
          </div>

          {/* Buttons */}
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("saving") : milestone ? t("update") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
