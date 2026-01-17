"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ACHIEVEMENT_BADGES } from "@/lib/achievement-badges";
import BadgeIcon from "@/components/badges/BadgeIcon";
import BadgeTemplateForm from "./BadgeTemplateForm";

type BadgeTemplate = {
  id: string;
  builtInBadgeId: string | null;
  choreId: string | null;
  type: string;
  name: string | null;
  nameZh: string | null;
  description: string | null;
  descriptionZh: string | null;
  imageUrl: string | null;
  icon: string | null;
};

export default function AchievementBadgeTemplateList() {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<{
    badgeId: string;
    template?: BadgeTemplate;
  } | null>(null);
  const t = useTranslations("badges");
  const locale = useLocale();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/badge-templates");
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTemplateForBadge = (badgeId: string): BadgeTemplate | undefined => {
    return templates.find(
      (t) => t.builtInBadgeId === badgeId && t.type === "achievement"
    );
  };

  const handleBadgeClick = (badgeId: string) => {
    const template = getTemplateForBadge(badgeId);
    setSelectedBadge({ badgeId, template });
  };

  const handleFormSuccess = () => {
    fetchTemplates();
    setSelectedBadge(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ACHIEVEMENT_BADGES.map((badge) => {
          const template = getTemplateForBadge(badge.id);
          const hasCustomization = !!template?.imageUrl;

          return (
            <button
              key={badge.id}
              onClick={() => handleBadgeClick(badge.id)}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                hover:shadow-md hover:border-purple-300
                ${hasCustomization ? "border-purple-200 bg-purple-50" : "border-gray-200 bg-white"}
              `}
            >
              {/* Custom indicator */}
              {hasCustomization && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
              )}

              {/* Badge Icon */}
              <div className="flex justify-center mb-2">
                <BadgeIcon
                  imageUrl={template?.imageUrl}
                  emoji={template?.icon || badge.icon}
                  size="lg"
                  alt={badge.name}
                />
              </div>

              {/* Badge Name */}
              <div className="text-sm font-medium text-gray-900 text-center truncate">
                {template?.name || (locale === "zh" ? badge.nameZh : badge.name)}
              </div>

              {/* Description */}
              <div className="text-xs text-gray-500 text-center truncate mt-1">
                {template?.description ||
                  (locale === "zh" ? badge.descriptionZh : badge.description)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Edit Modal */}
      {selectedBadge && (
        <BadgeTemplateForm
          type="achievement"
          builtInBadgeId={selectedBadge.badgeId}
          template={selectedBadge.template}
          builtInBadge={ACHIEVEMENT_BADGES.find(
            (b) => b.id === selectedBadge.badgeId
          )}
          onClose={() => setSelectedBadge(null)}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
