"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BADGE_LEVELS } from "@/lib/badges";
import BadgeIcon from "./BadgeIcon";
import BadgeDetailModal from "./BadgeDetailModal";
import { useNewDesign } from "@/hooks/useNewDesign";

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
  isCustomAward?: boolean;
  points?: number | null;
};

type AllAchievementBadge = {
  id: string;
  name: string;
  nameZh: string;
  description?: string;
  descriptionZh?: string;
  icon: string;
  customImageUrl?: string | null;
};

type SelectedBadge =
  | { type: "achievement"; badge: AllAchievementBadge; earned: boolean; earnedBadge?: AchievementBadge }
  | { type: "chore"; badge: Badge }
  | { type: "customAward"; badge: AchievementBadge };

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
  const [selectedBadge, setSelectedBadge] = useState<SelectedBadge | null>(null);
  const t = useTranslations("badges");
  const locale = useLocale();
  const { isNewDesign } = useNewDesign();

  // Coin Arcade badge tiles cycle through these pastel backgrounds
  const tileBgs = [
    "bg-ca-tile-teal", "bg-ca-tile-peach", "bg-ca-tile-pink",
    "bg-ca-tile-mint", "bg-ca-tile-lavender", "bg-ca-tile-butter",
  ];

  const theme = isNewDesign ? {
    skeleton: "bg-[rgba(26,24,19,0.04)]",
    nameEarned: "text-ca-ink",
    nameUnearned: "text-ca-muted",
    choreName: "text-ca-ink",
    customName: "text-ca-ink",
    grid: "grid grid-cols-3 sm:grid-cols-4 gap-3",
    badgeFrame: "w-14 h-14 rounded-full bg-[rgba(26,24,19,0.04)] flex items-center justify-center",
    badgeImg: "w-14 h-14 rounded-full object-cover",
    countBadge: "bg-ca-cobalt",
  } : {
    skeleton: "bg-gray-100",
    nameEarned: "text-gray-700",
    nameUnearned: "text-gray-400",
    choreName: "text-gray-700",
    customName: "text-gray-700",
    grid: "grid grid-cols-4 gap-4",
    badgeFrame: "",
    badgeImg: "",
    countBadge: "",
  };

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

  const customAwardBadges = achievementBadges.filter((b) => b.isCustomAward);
  const staticAchievementBadges = achievementBadges.filter(
    (b) => !b.isCustomAward
  );
  const earnedAchievementIds = new Set(
    staticAchievementBadges.map((b) => b.badgeId)
  );

  // Create a map of earned chore badges by choreId
  const earnedChoreBadgeMap = new Map(badges.map((b) => [b.chore.id, b]));

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={`w-20 h-20 ${theme.skeleton} rounded-lg animate-pulse`} />
            <div className={`w-12 h-3 ${theme.skeleton} rounded mt-2 animate-pulse`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={theme.grid}>
        {/* Achievement Badges - show all, gray out unearned */}
        {allAchievementBadges.map((badge, idx) => {
          const earned = earnedAchievementIds.has(badge.id);
          const earnedBadge = staticAchievementBadges.find(
            (b) => b.badgeId === badge.id
          );
          const tileBg = isNewDesign ? tileBgs[idx % tileBgs.length] : "";

          return (
            <button
              key={badge.id}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedBadge({ type: "achievement", badge, earned, earnedBadge })}
            >
              <div className={`${earned ? "" : "grayscale opacity-30"} transition-all`}>
                {isNewDesign ? (
                  <div className={theme.badgeFrame}>
                    {(earnedBadge?.customImageUrl || badge.customImageUrl) ? (
                      <img src={earnedBadge?.customImageUrl || badge.customImageUrl || ""} alt={badge.name} className={theme.badgeImg} />
                    ) : (
                      <span className="text-2xl">{badge.icon}</span>
                    )}
                  </div>
                ) : (
                  <BadgeIcon
                    imageUrl={earnedBadge?.customImageUrl || badge.customImageUrl}
                    emoji={badge.icon}
                    size="2xl"
                    alt={badge.name}
                    className={earned ? "" : "grayscale opacity-30"}
                  />
                )}
              </div>
              <div className={`text-[11px] text-center mt-1.5 font-bold leading-tight ${earned ? theme.nameEarned : theme.nameUnearned}`}>
                {locale === "zh" ? badge.nameZh : badge.name}
              </div>
            </button>
          );
        })}

        {customAwardBadges.map((badge, idx) => {
          const pending = !badge.customImageUrl;
          const tileBg = isNewDesign ? tileBgs[(allAchievementBadges.length + idx) % tileBgs.length] : "";

          return (
            <button
              key={badge.id}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedBadge({ type: "customAward", badge })}
            >
              <div className="relative">
                {isNewDesign ? (
                  <div className={`${theme.badgeFrame} ${pending ? "animate-pulse" : ""}`}>
                    {pending ? (
                      <span className="text-2xl opacity-50">✨</span>
                    ) : (
                      <img src={badge.customImageUrl!} alt={badge.name} className={theme.badgeImg} />
                    )}
                  </div>
                ) : pending ? (
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 animate-pulse flex items-center justify-center text-3xl">
                    🎨
                  </div>
                ) : (
                  <BadgeIcon
                    imageUrl={badge.customImageUrl}
                    emoji={badge.icon}
                    size="2xl"
                    alt={badge.name}
                  />
                )}
              </div>
              <div className={`text-[11px] text-center mt-1.5 font-bold ${theme.customName} leading-tight line-clamp-2`}>
                {badge.name}
              </div>
            </button>
          );
        })}

        {/* Chore Badges - show earned ones */}
        {badges.map((badge, idx) => {
          const showCount = badge.count > 1;
          const badgeColor = isNewDesign ? theme.countBadge : (levelBadgeColors[badge.level] || levelBadgeColors[1]);
          const tileBg = isNewDesign ? tileBgs[(allAchievementBadges.length + customAwardBadges.length + idx) % tileBgs.length] : "";

          return (
            <button
              key={badge.id}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedBadge({ type: "chore", badge })}
            >
              <div className="relative">
                {isNewDesign ? (
                  <div className={theme.badgeFrame}>
                    {badge.customImageUrl ? (
                      <img src={badge.customImageUrl} alt={badge.chore.title} className={theme.badgeImg} />
                    ) : (
                      <span className="text-2xl">{badge.customIcon || badge.chore.icon || "✨"}</span>
                    )}
                  </div>
                ) : (
                  <BadgeIcon
                    imageUrl={badge.customImageUrl}
                    emoji={badge.customIcon || badge.chore.icon || "✨"}
                    size="2xl"
                    alt={badge.chore.title}
                  />
                )}
                {showCount && (
                  <div className={`absolute -bottom-1 -right-1 ${badgeColor} text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm`}>
                    {badge.count}×
                  </div>
                )}
              </div>
              <div className={`text-[11px] text-center mt-1.5 font-bold ${theme.choreName} leading-tight`}>
                {badge.chore.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          {...selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </>
  );
}
