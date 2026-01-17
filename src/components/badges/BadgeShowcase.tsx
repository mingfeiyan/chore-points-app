"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BADGE_LEVELS } from "@/lib/badges";
import BadgeIcon from "./BadgeIcon";

type Badge = {
  id: string;
  count: number;
  level: number;
  levelName: string | null;
  levelIcon: string | null;
  progress: number;
  nextLevelAt: number | null;
  lastLevelUpAt: string | null;
  chore: {
    id: string;
    title: string;
    icon: string | null;
  };
  customImageUrl?: string | null;
  customIcon?: string | null;
};

type AchievementBadge = {
  id: string;
  badgeId: string;
  earnedAt: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
  customImageUrl?: string | null;
};

type AllAchievementBadge = {
  id: string;
  name: string;
  nameZh: string;
  icon: string;
  customImageUrl?: string | null;
};

// Level-based colors for the multiplier badge
const levelBadgeColors: Record<number, string> = {
  1: "bg-green-500",    // Starter - green
  2: "bg-amber-600",    // Bronze - bronze/amber
  3: "bg-gray-400",     // Silver - gray
  4: "bg-yellow-500",   // Gold - gold
  5: "bg-purple-500",   // Platinum - purple
  6: "bg-orange-500",   // Super - orange
};

type BadgeShowcaseProps = {
  kidId?: string;
};

export default function BadgeShowcase({ kidId }: BadgeShowcaseProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievementBadges, setAchievementBadges] = useState<AchievementBadge[]>([]);
  const [allAchievementBadges, setAllAchievementBadges] = useState<AllAchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("badges");
  const locale = useLocale();

  useEffect(() => {
    fetchBadges();
  }, [kidId]);

  const fetchBadges = async () => {
    try {
      const url = kidId ? `/api/badges?kidId=${kidId}` : "/api/badges";
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setBadges(data.badges || []);
        setAchievementBadges(data.achievementBadges || []);
        setAllAchievementBadges(data.allAchievementBadges || []);
      }
    } catch (error) {
      console.error("Failed to fetch badges:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create a set of earned achievement badge IDs
  const earnedAchievementIds = new Set(achievementBadges.map((b) => b.badgeId));

  // Create a map of earned chore badges by choreId
  const earnedChoreBadgeMap = new Map(badges.map((b) => [b.chore.id, b]));

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse" />
            <div className="w-12 h-3 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Achievement Badges - show all, gray out unearned */}
      {allAchievementBadges.map((badge) => {
        const earned = earnedAchievementIds.has(badge.id);
        const earnedBadge = achievementBadges.find((b) => b.badgeId === badge.id);

        return (
          <div
            key={badge.id}
            className="flex flex-col items-center"
          >
            {/* Sticker */}
            <div className={`${earned ? "" : "grayscale opacity-30"} transition-all`}>
              <BadgeIcon
                imageUrl={earned ? earnedBadge?.customImageUrl : null}
                emoji={badge.icon}
                size="2xl"
                alt={badge.name}
                className={earned ? "" : "grayscale opacity-30"}
              />
            </div>
            {/* Name */}
            <div className={`text-xs text-center mt-2 font-medium leading-tight ${earned ? "text-gray-700" : "text-gray-400"}`}>
              {locale === "zh" ? badge.nameZh : badge.name}
            </div>
          </div>
        );
      })}

      {/* Chore Badges - show earned ones */}
      {badges.map((badge) => {
        const showCount = badge.count > 1;
        const badgeColor = levelBadgeColors[badge.level] || levelBadgeColors[1];

        return (
          <div
            key={badge.id}
            className="flex flex-col items-center"
          >
            {/* Sticker with count indicator */}
            <div className="relative">
              <BadgeIcon
                imageUrl={badge.customImageUrl}
                emoji={badge.customIcon || badge.chore.icon || "✨"}
                size="2xl"
                alt={badge.chore.title}
              />
              {/* Count indicator like "2x" */}
              {showCount && (
                <div className={`absolute -bottom-1 -right-1 ${badgeColor} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-sm`}>
                  {badge.count}x
                </div>
              )}
            </div>
            {/* Name */}
            <div className="text-xs text-center mt-2 font-medium text-gray-700 leading-tight">
              {badge.chore.title}
            </div>
          </div>
        );
      })}
    </div>
  );
}
