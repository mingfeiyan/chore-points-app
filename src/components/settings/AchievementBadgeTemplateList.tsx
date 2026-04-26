"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Eye, EyeOff, Sparkles } from "lucide-react";
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
  hidden?: boolean;
  forceShow?: boolean;
};

type Visibility = "auto" | "shown" | "hidden";

const visibilityOf = (t: BadgeTemplate | undefined): Visibility => {
  if (t?.hidden) return "hidden";
  if (t?.forceShow) return "shown";
  return "auto";
};

const nextVisibility = (v: Visibility): Visibility => {
  // Auto → Shown (force-show) → Hidden → Auto
  if (v === "auto") return "shown";
  if (v === "shown") return "hidden";
  return "auto";
};

const visibilityFlags = (v: Visibility) => ({
  hidden: v === "hidden",
  forceShow: v === "shown",
});

export default function AchievementBadgeTemplateList() {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<{
    badgeId: string;
    template?: BadgeTemplate;
  } | null>(null);
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

  const handleCycleVisibility = async (
    badgeId: string,
    template: BadgeTemplate | undefined
  ) => {
    const next = nextVisibility(visibilityOf(template));
    const flags = visibilityFlags(next);
    try {
      if (template) {
        await fetch(`/api/badge-templates/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(flags),
        });
      } else {
        await fetch(`/api/badge-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "achievement",
            builtInBadgeId: badgeId,
            ...flags,
          }),
        });
      }
      fetchTemplates();
    } catch (error) {
      console.error("Failed to cycle badge visibility:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 bg-[rgba(68,55,32,0.06)] rounded-lg animate-pulse"
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
          const visibility = visibilityOf(template);

          const tileClass =
            visibility === "hidden"
              ? "border-dashed border-[rgba(68,55,32,0.25)] bg-[rgba(68,55,32,0.04)] opacity-70"
              : visibility === "shown"
              ? "border-[#a87a3c] bg-[rgba(212,166,116,0.08)]"
              : hasCustomization
              ? "border-[#6b8e4e] bg-[rgba(107,142,78,0.06)]"
              : "border-[rgba(68,55,32,0.14)] bg-white";

          const VisIcon =
            visibility === "hidden"
              ? EyeOff
              : visibility === "shown"
              ? Sparkles
              : Eye;

          const visTooltip =
            visibility === "hidden"
              ? "Hidden from kids — click for Auto"
              : visibility === "shown"
              ? "Force-shown to kids — click to Hide"
              : "Auto (progressive) — click to Force-show";

          const subText =
            visibility === "hidden"
              ? "Hidden from kids"
              : visibility === "shown"
              ? "Force-shown to kids"
              : template?.description ||
                (locale === "zh" ? badge.descriptionZh : badge.description);

          return (
            <div
              key={badge.id}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${tileClass}`}
            >
              <button
                type="button"
                onClick={() => handleCycleVisibility(badge.id, template)}
                aria-label={visTooltip}
                title={visTooltip}
                className="absolute top-1 right-1 p-1 rounded-md text-pg-muted hover:text-pg-ink hover:bg-pg-cream transition-colors"
              >
                <VisIcon size={14} />
              </button>

              {hasCustomization && visibility !== "hidden" && (
                <div className="absolute top-1 left-1 w-2 h-2 bg-[#6b8e4e] rounded-full" />
              )}

              <button
                type="button"
                onClick={() => handleBadgeClick(badge.id)}
                className="block w-full text-left"
              >
                <div className="flex justify-center mb-2">
                  <BadgeIcon
                    imageUrl={template?.imageUrl || badge.imageUrl}
                    emoji={template?.icon || badge.icon}
                    size="lg"
                    alt={badge.name}
                  />
                </div>
                <div className="text-sm font-medium text-[#2f2a1f] text-center truncate">
                  {template?.name || (locale === "zh" ? badge.nameZh : badge.name)}
                </div>
                <div className="text-xs text-[#857d68] text-center truncate mt-1">
                  {subText}
                </div>
              </button>
            </div>
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
