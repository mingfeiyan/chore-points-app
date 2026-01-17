"use client";

import { useTranslations } from "next-intl";
import { BADGE_LEVELS } from "@/lib/badges";
import BadgeIcon from "./BadgeIcon";

type BadgeCardProps = {
  badge: {
    id: string;
    count: number;
    level: number;
    levelName: string | null;
    levelIcon: string | null;
    progress: number;
    nextLevelAt: number | null;
    chore: {
      id: string;
      title: string;
      icon: string | null;
    };
    lastLevelUpAt: string | null;
    customImageUrl?: string | null;
    customIcon?: string | null;
  };
  showKidName?: boolean;
  kidName?: string;
};

// Level-specific gradient backgrounds
const levelGradients: Record<number, string> = {
  1: "from-green-100 to-green-200",
  2: "from-amber-100 to-amber-200",
  3: "from-gray-200 to-gray-300",
  4: "from-yellow-200 to-yellow-300",
  5: "from-purple-100 to-purple-200",
  6: "from-yellow-300 via-orange-300 to-red-300",
};

const levelBorders: Record<number, string> = {
  1: "border-green-300",
  2: "border-amber-400",
  3: "border-gray-400",
  4: "border-yellow-500",
  5: "border-purple-400",
  6: "border-yellow-500",
};

export default function BadgeCard({ badge, showKidName, kidName }: BadgeCardProps) {
  const t = useTranslations("badges");

  const isMaxLevel = badge.level === BADGE_LEVELS.length;
  const isNew =
    badge.lastLevelUpAt &&
    new Date(badge.lastLevelUpAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div
      className={`relative bg-gradient-to-br ${levelGradients[badge.level] || levelGradients[1]}
        rounded-xl p-4 border-2 ${levelBorders[badge.level] || levelBorders[1]}
        shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* New badge indicator */}
      {isNew && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
          {t("newBadge")}
        </div>
      )}

      {/* Chore icon and title */}
      <div className="flex items-center gap-3 mb-3">
        <BadgeIcon
          imageUrl={badge.customImageUrl}
          emoji={badge.customIcon || badge.chore.icon || "✨"}
          size="lg"
          alt={badge.chore.title}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{badge.chore.title}</h3>
          {showKidName && kidName && (
            <p className="text-xs text-gray-600">{kidName}</p>
          )}
        </div>
      </div>

      {/* Level badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{badge.levelIcon}</span>
          <span className="font-semibold text-gray-800">
            {badge.levelName}
          </span>
        </div>
        <span className="text-sm text-gray-600">
          {badge.count} {t("times")}
        </span>
      </div>

      {/* Progress bar */}
      {!isMaxLevel && badge.nextLevelAt && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{t("progress")}</span>
            <span>{t("nextLevel", { count: badge.nextLevelAt })}</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Max level indicator */}
      {isMaxLevel && (
        <div className="mt-3 text-center">
          <span className="text-sm font-medium text-yellow-700">
            {t("maxLevel")}
          </span>
        </div>
      )}
    </div>
  );
}
