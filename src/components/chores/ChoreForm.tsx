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

const iconCategories = {
  "Cleaning": ["🧹", "🌀", "🪣", "✨", "🧺", "🧽", "🫧", "💫", "🧴"],
  "Dishes": ["🍽️", "🫧", "💨", "🗄️"],
  "Laundry": ["👕", "👔", "🧺", "🪝", "♨️"],
  "Clothes": ["🩱", "🌙", "🎒", "👔", "👕", "👖", "👗", "🧥", "🧶", "🧦", "👟", "👢", "🩴", "🧢", "🧣", "🧤", "🩲", "🎽", "🩰"],
  "Bedroom": ["🛏️", "🛋️", "🧣"],
  "Bathroom": ["🚿", "🚽", "🪥", "🛁", "🪞", "🚰", "🧻"],
  "Kitchen": ["👨‍🍳", "🍳", "🥐", "🍲", "🥞", "🥪", "🍝", "🍪", "🪑", "🍴"],
  "Trash": ["🗑️", "♻️", "🌿"],
  "Pets": ["🐕", "🐱", "🦴", "🦮", "🐠", "🐦", "🐹", "🐰", "🐢", "🐟", "🪮"],
  "Garden": ["🌱", "💧", "🪴", "🌿", "🚜", "🍂", "🍁", "🌸", "🌳", "💦", "☀️", "❄️", "⛄"],
  "Study": ["📚", "📖", "🔢", "✏️", "🎯", "🎹", "🎵", "🎸", "🎨", "🖍️", "🔬", "📋", "💻", "⌨️"],
  "Organize": ["📦", "🗂️", "📐", "🗄️", "🚪", "🗃️", "🧸", "🎮", "🎲", "📗", "🎒", "🖥️"],
  "Errands": ["🤝", "🛒", "🛍️", "🚗", "🚙", "📬", "📦", "🏃", "📱", "💬"],
  "Power-ups": ["🎁", "⭐", "🌟", "➕", "⚡", "🏆", "💪", "🔥", "🎯", "🚀", "💎"],
  "Self-care": ["🦷", "💇", "🧼", "🙌", "💅"],
  "Time": ["🌅", "🌆", "🌙", "📅", "🗓️", "🔄"],
};

const inputClass =
  "w-full px-3 py-2 rounded-[10px] border border-pg-line bg-white text-pg-ink focus:outline-none focus:border-pg-accent transition-colors";

const labelClass = "block text-sm font-semibold text-pg-ink mb-1";

const primaryBtn: React.CSSProperties = {
  background: "#4a6a32",
  boxShadow: "0 2px 0 rgba(74,106,50,0.3)",
};

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-[family-name:var(--font-inter)]">
      <div className="bg-white rounded-[14px] border border-pg-line w-full max-w-md max-h-[90dvh] flex flex-col">
        <div className="flex justify-between items-center px-4 sm:px-6 pt-4 sm:pt-6 pb-3 shrink-0">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-medium text-pg-ink">
            {chore ? t("editChore") : t("addChoreTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-pg-muted hover:text-pg-ink"
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4 space-y-4">
          {error && (
            <div className="bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.25)] text-pg-coral px-4 py-3 rounded-[10px] text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className={labelClass}>
              {t("choreName")}
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Wash dishes, Take out trash"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t("iconLabel")}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-14 h-14 text-3xl border-2 border-dashed border-pg-line rounded-[10px] hover:border-pg-accent hover:bg-[rgba(107,142,78,0.06)] transition-colors flex items-center justify-center"
              >
                {icon || "➕"}
              </button>
              {icon && (
                <button
                  type="button"
                  onClick={() => setIcon("")}
                  className="text-sm text-pg-muted hover:text-pg-coral"
                >
                  {t("clear")}
                </button>
              )}
              <span className="text-sm text-pg-muted ml-2">
                {icon ? t("clickToChange") : t("clickToPick")}
              </span>
            </div>

            {showIconPicker && (
              <div className="mt-2 p-3 bg-pg-cream rounded-[10px] border border-pg-line max-h-[50dvh] overflow-y-auto">
                {Object.entries(iconCategories).map(([category, icons]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-bold text-pg-muted uppercase tracking-wide mb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                      {icons.map((emoji, idx) => (
                        <button
                          key={`${category}-${emoji}-${idx}`}
                          type="button"
                          onClick={() => {
                            setIcon(emoji);
                            setShowIconPicker(false);
                          }}
                          className={`text-xl sm:text-2xl p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5 rounded-[8px] hover:bg-[rgba(107,142,78,0.12)] transition-colors flex items-center justify-center ${
                            icon === emoji
                              ? "bg-[rgba(107,142,78,0.2)] ring-2 ring-pg-accent"
                              : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-pg-line">
                  <label className="block text-xs text-pg-muted mb-1">
                    {t("orTypeEmoji")}
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="Type or paste an emoji"
                    className={`${inputClass} text-lg`}
                    maxLength={4}
                  />
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-pg-muted">{t("iconHelp")}</p>
          </div>

          <div>
            <label htmlFor="defaultPoints" className={labelClass}>
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
              className={inputClass}
            />
            <p className="mt-1 text-sm text-pg-muted">{t("pointsAwarded")}</p>
          </div>

          </div>

          <div className="flex space-x-3 px-4 sm:px-6 py-3 border-t border-pg-line bg-white rounded-b-[14px] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 min-h-[44px] border border-pg-line rounded-[10px] text-pg-ink hover:bg-pg-cream font-semibold text-sm"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 min-h-[44px] text-white rounded-[10px] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-[1.01]"
              style={primaryBtn}
            >
              {loading ? t("saving") : chore ? t("update") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
