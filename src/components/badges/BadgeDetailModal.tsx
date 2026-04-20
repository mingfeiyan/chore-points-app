"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BadgeIcon from "./BadgeIcon";
import { BADGE_LEVELS } from "@/lib/badges";
import { useNewDesign } from "@/hooks/useNewDesign";

type ChoreBadge = {
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
  firstEarnedAt?: string | null;
};

type AchievementBadgeInfo = {
  id: string;
  name: string;
  nameZh: string;
  description?: string;
  descriptionZh?: string;
  icon: string;
  customImageUrl?: string | null;
};

type EarnedAchievementBadge = {
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

type BadgeDetailModalProps = {
  onClose: () => void;
} & (
  | {
      type: "achievement";
      badge: AchievementBadgeInfo;
      earned: boolean;
      earnedBadge?: EarnedAchievementBadge;
    }
  | {
      type: "chore";
      badge: ChoreBadge;
    }
  | {
      type: "customAward";
      badge: EarnedAchievementBadge;
    }
);

// Level colors for the progress bar
const levelColors: Record<number, { bg: string; fill: string }> = {
  1: { bg: "bg-green-100", fill: "bg-green-500" },
  2: { bg: "bg-amber-100", fill: "bg-amber-500" },
  3: { bg: "bg-gray-200", fill: "bg-gray-500" },
  4: { bg: "bg-yellow-100", fill: "bg-yellow-500" },
  5: { bg: "bg-purple-100", fill: "bg-purple-500" },
  6: { bg: "bg-orange-100", fill: "bg-orange-500" },
};

export default function BadgeDetailModal(props: BadgeDetailModalProps) {
  const { onClose } = props;
  const t = useTranslations("badges");
  const locale = useLocale();
  const { data: session } = useSession();
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const isParent = session?.user?.role === "PARENT";
  const { isNewDesign } = useNewDesign();

  const theme = isNewDesign ? {
    close: "text-[#857d68] hover:text-[#2f2a1f]",
    title: "text-[#2f2a1f]",
    titleUnearned: "text-[#857d68]",
    desc: "text-[#857d68]",
    descUnearned: "text-[#857d68]",
    earnedBg: "text-[#4a6a32] bg-[rgba(107,142,78,0.1)]",
    unearnedBg: "text-[#857d68] bg-[rgba(68,55,32,0.06)]",
    dateBg: "text-[#857d68] bg-[rgba(68,55,32,0.06)]",
    positive: "text-[#4a6a32]",
    levelText: "text-[#2f2a1f]",
    progress: "text-[#857d68]",
    maxLevel: "text-[#6b8e4e] bg-[rgba(107,142,78,0.1)]",
    completedText: "text-[#857d68]",
    regenBtn: "bg-[#4a6a32] text-white hover:bg-[#3d5a2a]",
  } : {
    close: "text-gray-400 hover:text-gray-600",
    title: "text-gray-900",
    titleUnearned: "text-gray-400",
    desc: "text-gray-600",
    descUnearned: "text-gray-400",
    earnedBg: "text-green-600 bg-green-50",
    unearnedBg: "text-gray-400 bg-gray-100",
    dateBg: "text-gray-600 bg-gray-50",
    positive: "text-green-600",
    levelText: "text-gray-700",
    progress: "text-gray-500",
    maxLevel: "text-yellow-600 bg-yellow-50",
    completedText: "text-gray-500",
    regenBtn: "bg-purple-600 text-white hover:bg-purple-700",
  };

  const handleRegenerate = async (badgeId: string) => {
    setRegenerating(true);
    try {
      const res = await fetch(
        `/api/achievement-badges/${badgeId}/regenerate-image`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to regenerate");
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      console.error("Regenerate failed:", err);
      alert("Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get next level info
  const getNextLevel = (currentLevel: number) => {
    return BADGE_LEVELS.find((l) => l.level === currentLevel + 1);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${theme.close} transition-colors`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {props.type === "customAward" ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              {props.badge.customImageUrl ? (
                <BadgeIcon
                  imageUrl={props.badge.customImageUrl}
                  emoji="🎨"
                  size="2xl"
                  alt={props.badge.name}
                  className="w-32 h-32 text-8xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 animate-pulse flex items-center justify-center text-6xl">
                  🎨
                </div>
              )}
            </div>
            <h2 className={`text-xl font-bold ${theme.title} mb-2`}>
              {props.badge.name}
            </h2>
            {props.badge.description && (
              <p className={`text-sm ${theme.desc} mb-4`}>
                {props.badge.description}
              </p>
            )}
            {typeof props.badge.points === "number" && (
              <div className={`mb-3 text-sm font-semibold ${theme.positive}`}>
                +{props.badge.points} pts
              </div>
            )}
            <div className={`flex items-center gap-2 ${theme.dateBg} px-4 py-2 rounded-full mb-3`}>
              <span className="text-sm">{formatDate(props.badge.earnedAt)}</span>
            </div>
            {isParent && (
              <button
                onClick={() => handleRegenerate(props.badge.id)}
                disabled={regenerating}
                className={`mt-2 px-4 py-2 text-sm ${theme.regenBtn} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {regenerating
                  ? t("regenerating")
                  : props.badge.customImageUrl
                    ? t("regenerate")
                    : t("generate")}
              </button>
            )}
          </div>
        ) : props.type === "achievement" ? (
          // Achievement Badge Detail
          <div className="flex flex-col items-center text-center">
            {/* Large Badge */}
            <div className={`mb-4 ${props.earned ? "" : "grayscale opacity-40"}`}>
              <BadgeIcon
                imageUrl={props.earnedBadge?.customImageUrl || props.badge.customImageUrl}
                emoji={props.badge.icon}
                size="2xl"
                alt={props.badge.name}
                className={`w-32 h-32 text-8xl ${props.earned ? "" : "grayscale opacity-40"}`}
              />
            </div>

            {/* Badge Name */}
            <h2 className={`text-xl font-bold mb-2 ${props.earned ? theme.title : theme.titleUnearned}`}>
              {locale === "zh" ? props.badge.nameZh : props.badge.name}
            </h2>

            {/* Description */}
            {(props.badge.description || props.badge.descriptionZh) && (
              <p className={`text-sm mb-4 ${props.earned ? theme.desc : theme.descUnearned}`}>
                {locale === "zh"
                  ? props.badge.descriptionZh || props.badge.description
                  : props.badge.description || props.badge.descriptionZh}
              </p>
            )}

            {/* Earned Status */}
            {props.earned && props.earnedBadge ? (
              <div className={`flex items-center gap-2 ${theme.earnedBg} px-4 py-2 rounded-full`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  {formatDate(props.earnedBadge.earnedAt)}
                </span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 ${theme.unearnedBg} px-4 py-2 rounded-full`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  {locale === "zh" ? "尚未获得" : "Not yet earned"}
                </span>
              </div>
            )}
          </div>
        ) : (
          // Chore Badge Detail
          <div className="flex flex-col items-center text-center">
            {/* Large Badge with count */}
            <div className="relative mb-4">
              <BadgeIcon
                imageUrl={props.badge.customImageUrl}
                emoji={props.badge.customIcon || props.badge.chore.icon || "✨"}
                size="2xl"
                alt={props.badge.chore.title}
                className="w-32 h-32 text-8xl"
              />
              {/* Count badge */}
              {props.badge.count > 1 && (
                <div className={`absolute -bottom-2 -right-2 ${levelColors[props.badge.level]?.fill || "bg-green-500"} text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-md`}>
                  {props.badge.count}x
                </div>
              )}
            </div>

            {/* Badge Name */}
            <h2 className={`text-xl font-bold ${theme.title} mb-1`}>
              {props.badge.chore.title}
            </h2>

            {/* Level */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{props.badge.levelIcon}</span>
              <span className={`text-lg font-medium ${theme.levelText}`}>
                {props.badge.levelName}
              </span>
            </div>

            {/* Progress to next level */}
            {props.badge.nextLevelAt && (
              <div className="w-full mb-4">
                <div className="flex justify-between text-xs ${theme.progress} mb-1">
                  <span>{t("progress")}</span>
                  <span>
                    {props.badge.count}/{props.badge.nextLevelAt} {locale === "zh" ? "次" : ""}
                  </span>
                </div>
                <div className={`h-2 ${levelColors[props.badge.level]?.bg || "bg-gray-100"} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full ${levelColors[props.badge.level]?.fill || "bg-green-500"} rounded-full transition-all duration-500`}
                    style={{ width: `${props.badge.progress}%` }}
                  />
                </div>
                {(() => {
                  const nextLevel = getNextLevel(props.badge.level);
                  return nextLevel ? (
                    <div className={`text-xs ${theme.progress} mt-1`}>
                      {locale === "zh"
                        ? `还需 ${props.badge.nextLevelAt - props.badge.count} 次升级到 ${nextLevel.name}`
                        : `${props.badge.nextLevelAt - props.badge.count} more to ${nextLevel.name}`}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Max level indicator */}
            {!props.badge.nextLevelAt && (
              <div className={`flex items-center gap-2 ${theme.maxLevel} px-4 py-2 rounded-full mb-4`}>
                <span className="text-lg">⭐</span>
                <span className="text-sm font-medium">{t("maxLevel")}</span>
              </div>
            )}

            {/* Times completed */}
            <div className={`text-sm ${theme.completedText}`}>
              {locale === "zh"
                ? `已完成 ${props.badge.count} 次`
                : `Completed ${props.badge.count} ${props.badge.count === 1 ? "time" : "times"}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
