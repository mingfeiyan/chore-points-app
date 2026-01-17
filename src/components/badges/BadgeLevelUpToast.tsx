"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import BadgeIcon from "./BadgeIcon";

type BadgeLevelUpInfo = {
  choreTitle: string;
  choreIcon: string | null;
  newLevel: number;
  levelName: string | null;
  levelIcon: string | null;
  count: number;
  isFirstTime: boolean;
  customImageUrl?: string | null;
  customIcon?: string | null;
};

type BadgeLevelUpToastProps = {
  levelUpInfo: BadgeLevelUpInfo;
  onClose: () => void;
};

export default function BadgeLevelUpToast({
  levelUpInfo,
  onClose,
}: BadgeLevelUpToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations("badges");

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-2xl shadow-2xl p-1">
        <div className="bg-white rounded-xl px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Badge icon with animation */}
            <div className="relative">
              <div className="animate-bounce">
                <BadgeIcon
                  imageUrl={levelUpInfo.customImageUrl}
                  emoji={levelUpInfo.customIcon || levelUpInfo.levelIcon || "🏅"}
                  size="xl"
                  alt="Badge"
                />
              </div>
              {/* Sparkle effects */}
              <div className="absolute -top-1 -right-1 text-xl animate-ping">
                ✨
              </div>
            </div>

            <div className="flex-1">
              {/* Title */}
              <div className="font-bold text-lg text-gray-900">
                {levelUpInfo.isFirstTime ? t("newBadge") : t("levelUp")}
              </div>

              {/* Chore info */}
              <div className="flex items-center gap-2 text-gray-700">
                <BadgeIcon
                  imageUrl={levelUpInfo.customImageUrl}
                  emoji={levelUpInfo.customIcon || levelUpInfo.choreIcon || "✨"}
                  size="sm"
                  alt={levelUpInfo.choreTitle}
                />
                <span className="font-medium">{levelUpInfo.choreTitle}</span>
              </div>

              {/* Level info */}
              <div className="text-sm text-gray-600 mt-1">
                {levelUpInfo.isFirstTime
                  ? t("firstTime")
                  : t("reachedLevel", { level: levelUpInfo.levelName || "" })}
                <span className="ml-2 text-gray-500">
                  ({levelUpInfo.count} {t("times")})
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
