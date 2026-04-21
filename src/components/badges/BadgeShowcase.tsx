"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import BadgeDetailModal from "./BadgeDetailModal";

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

type BadgeShowcaseProps = {
  kidId?: string;
};

export default function BadgeShowcase({ kidId }: BadgeShowcaseProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievementBadges, setAchievementBadges] = useState<AchievementBadge[]>([]);
  const [allAchievementBadges, setAllAchievementBadges] = useState<AllAchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<SelectedBadge | null>(null);
  const locale = useLocale();

  const theme = {
    skeleton: "bg-[rgba(26,24,19,0.04)]",
    nameEarned: "text-ca-ink",
    nameUnearned: "text-ca-muted",
    choreName: "text-ca-ink",
    customName: "text-ca-ink",
    grid: "grid grid-cols-3 sm:grid-cols-4 gap-3",
    badgeFrame: "w-14 h-14 rounded-full bg-[rgba(26,24,19,0.04)] flex items-center justify-center",
    badgeImg: "w-14 h-14 rounded-full object-cover",
    countBadge: "bg-ca-cobalt",
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
        {allAchievementBadges.map((badge) => {
          const earned = earnedAchievementIds.has(badge.id);
          const earnedBadge = staticAchievementBadges.find(
            (b) => b.badgeId === badge.id
          );
          return (
            <button
              key={badge.id}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedBadge({ type: "achievement", badge, earned, earnedBadge })}
            >
              <div className={`${earned ? "" : "grayscale opacity-30"} transition-all`}>
                <div className={theme.badgeFrame}>
                  {(earnedBadge?.customImageUrl || badge.customImageUrl) ? (
                    <img src={earnedBadge?.customImageUrl || badge.customImageUrl || ""} alt={badge.name} className={theme.badgeImg} />
                  ) : (
                    <span className="text-2xl">{badge.icon}</span>
                  )}
                </div>
              </div>
              <div className={`text-[11px] text-center mt-1.5 font-bold leading-tight ${earned ? theme.nameEarned : theme.nameUnearned}`}>
                {locale === "zh" ? badge.nameZh : badge.name}
              </div>
            </button>
          );
        })}

        {customAwardBadges.map((badge) => {
          const pending = !badge.customImageUrl;
          return (
            <button
              key={badge.id}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedBadge({ type: "customAward", badge })}
            >
              <div className="relative">
                <div className={`${theme.badgeFrame} ${pending ? "animate-pulse" : ""}`}>
                  {pending ? (
                    <span className="text-2xl opacity-50">✨</span>
                  ) : (
                    <img src={badge.customImageUrl!} alt={badge.name} className={theme.badgeImg} />
                  )}
                </div>
              </div>
              <div className={`text-[11px] text-center mt-1.5 font-bold ${theme.customName} leading-tight line-clamp-2`}>
                {badge.name}
              </div>
            </button>
          );
        })}

        {/* Chore Badges - show earned ones */}
        {badges.map((badge) => {
          const showCount = badge.count > 1;
          const badgeColor = theme.countBadge;
          return (
            <button
              key={badge.id}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedBadge({ type: "chore", badge })}
            >
              <div className="relative">
                <div className={theme.badgeFrame}>
                  {badge.customImageUrl ? (
                    <img src={badge.customImageUrl} alt={badge.chore.title} className={theme.badgeImg} />
                  ) : (
                    <span className="text-2xl">{badge.customIcon || badge.chore.icon || "✨"}</span>
                  )}
                </div>
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
