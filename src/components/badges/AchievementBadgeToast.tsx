"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import BadgeIcon from "./BadgeIcon";

type AchievementBadgeInfo = {
  badgeId: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
  customImageUrl?: string | null;
};

type AchievementBadgeToastProps = {
  badges: AchievementBadgeInfo[];
  onClose: () => void;
};

export default function AchievementBadgeToast({
  badges,
  onClose,
}: AchievementBadgeToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useTranslations("badges");
  const locale = useLocale();

  const currentBadge = badges[currentIndex];

  useEffect(() => {
    setIsVisible(true);

    // Auto-advance through badges or close
    const timer = setTimeout(() => {
      if (currentIndex < badges.length - 1) {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
          setIsVisible(true);
        }, 300);
      } else {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentIndex, badges.length, onClose]);

  if (!currentBadge) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-1">
        <div className="bg-white rounded-xl px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Badge icon with animation */}
            <div className="relative">
              <div className="animate-bounce">
                <BadgeIcon
                  imageUrl={currentBadge.customImageUrl}
                  emoji={currentBadge.icon}
                  size="xl"
                  alt={currentBadge.name}
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
                {t("earnedBadge")}
              </div>

              {/* Badge name */}
              <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                {locale === "zh" ? currentBadge.nameZh : currentBadge.name}
              </div>

              {/* Description */}
              <div className="text-sm text-gray-600 mt-1">
                {locale === "zh" ? currentBadge.descriptionZh : currentBadge.description}
              </div>

              {/* Progress indicator for multiple badges */}
              {badges.length > 1 && (
                <div className="flex gap-1 mt-2">
                  {badges.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${
                        idx === currentIndex ? "bg-indigo-500" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              )}
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
