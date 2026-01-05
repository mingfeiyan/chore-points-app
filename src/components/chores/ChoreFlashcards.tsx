"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Chore = {
  id: string;
  title: string;
  icon: string | null;
  defaultPoints: number;
};

// Default icons for common chores (emoji-based)
const defaultIcons: Record<string, string> = {
  // Cleaning
  "clean": "🧹",
  "vacuum": "🧹",
  "sweep": "🧹",
  "mop": "🪣",
  "dust": "✨",
  "tidy": "🧺",
  // Dishes
  "dish": "🍽️",
  "dishes": "🍽️",
  "wash dishes": "🍽️",
  "load dishwasher": "🍽️",
  "unload dishwasher": "🍽️",
  // Laundry
  "laundry": "👕",
  "clothes": "👕",
  "fold": "👕",
  "wash clothes": "🧺",
  // Bedroom
  "bed": "🛏️",
  "make bed": "🛏️",
  "bedroom": "🛏️",
  // Bathroom
  "bathroom": "🚿",
  "toilet": "🚽",
  "brush teeth": "🪥",
  // Kitchen
  "cook": "👨‍🍳",
  "cooking": "👨‍🍳",
  "kitchen": "🍳",
  // Trash
  "trash": "🗑️",
  "garbage": "🗑️",
  "take out trash": "🗑️",
  "recycling": "♻️",
  // Pets
  "pet": "🐕",
  "dog": "🐕",
  "cat": "🐱",
  "feed pet": "🐕",
  "walk dog": "🦮",
  // Garden/Outdoor
  "garden": "🌱",
  "water plants": "🌱",
  "plants": "🪴",
  "yard": "🌿",
  "lawn": "🌿",
  "mow": "🌿",
  // Homework
  "homework": "📚",
  "study": "📖",
  "read": "📖",
  "reading": "📖",
  // Other
  "organize": "📦",
  "help": "🤝",
  "grocery": "🛒",
  "shopping": "🛒",
  "car": "🚗",
  "wash car": "🚗",
};

function getIconForChore(title: string, icon: string | null): string {
  // If custom icon is set, use it
  if (icon) return icon;

  // Try to match title with default icons
  const lowerTitle = title.toLowerCase();

  // Check for exact match first
  if (defaultIcons[lowerTitle]) {
    return defaultIcons[lowerTitle];
  }

  // Check if any key is contained in the title
  for (const [key, emoji] of Object.entries(defaultIcons)) {
    if (lowerTitle.includes(key)) {
      return emoji;
    }
  }

  // Default star icon
  return "⭐";
}

export default function ChoreFlashcards() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("chores");
  const tCommon = useTranslations("common");

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      const response = await fetch("/api/chores/available");
      const data = await response.json();
      if (response.ok) {
        setChores(data.chores);
      }
    } catch (error) {
      console.error("Failed to fetch chores:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-2xl p-6 animate-pulse h-40"
          />
        ))}
      </div>
    );
  }

  if (chores.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <p className="text-gray-500">{t("noChoresYet")}</p>
        <p className="text-sm text-gray-400 mt-1">
          {t("askParents")}
        </p>
      </div>
    );
  }

  // Color palette for flashcards
  const colors = [
    "from-pink-400 to-pink-500",
    "from-purple-400 to-purple-500",
    "from-indigo-400 to-indigo-500",
    "from-blue-400 to-blue-500",
    "from-cyan-400 to-cyan-500",
    "from-teal-400 to-teal-500",
    "from-green-400 to-green-500",
    "from-yellow-400 to-yellow-500",
    "from-orange-400 to-orange-500",
    "from-red-400 to-red-500",
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {chores.map((chore, index) => (
        <div
          key={chore.id}
          className={`bg-gradient-to-br ${colors[index % colors.length]} rounded-2xl p-5 text-white shadow-lg transform hover:scale-105 transition-transform cursor-default`}
        >
          <div className="flex flex-col items-center text-center min-h-[120px]">
            {/* Large Icon */}
            <span className="text-5xl mb-3" role="img" aria-label={chore.title}>
              {getIconForChore(chore.title, chore.icon)}
            </span>

            {/* Chore Title */}
            <h3 className="font-bold text-base leading-tight mb-2">
              {chore.title}
            </h3>

            {/* Points Badge */}
            <div className="mt-auto">
              <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold">
                +{chore.defaultPoints} {tCommon("points")}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
