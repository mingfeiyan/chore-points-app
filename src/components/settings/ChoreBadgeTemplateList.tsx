"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import BadgeIcon from "@/components/badges/BadgeIcon";
import BadgeTemplateForm from "./BadgeTemplateForm";

type Chore = {
  id: string;
  title: string;
  icon: string | null;
};

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
  chore?: Chore | null;
  hidden?: boolean;
};

export default function ChoreBadgeTemplateList() {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChore, setSelectedChore] = useState<{
    chore: Chore;
    template?: BadgeTemplate;
  } | null>(null);
  const t = useTranslations("badges");
  const tChores = useTranslations("chores");

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchChores()]).finally(() =>
      setLoading(false)
    );
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
    }
  };

  const fetchChores = async () => {
    try {
      const response = await fetch("/api/chores");
      const data = await response.json();
      if (response.ok) {
        setChores(data.chores || []);
      }
    } catch (error) {
      console.error("Failed to fetch chores:", error);
    }
  };

  const getTemplateForChore = (choreId: string): BadgeTemplate | undefined => {
    return templates.find(
      (t) => t.choreId === choreId && t.type === "chore_level"
    );
  };

  const handleChoreClick = (chore: Chore) => {
    const template = getTemplateForChore(chore.id);
    setSelectedChore({ chore, template });
  };

  const handleFormSuccess = () => {
    fetchTemplates();
    setSelectedChore(null);
  };

  const handleToggleVisibility = async (
    choreId: string,
    template: BadgeTemplate | undefined
  ) => {
    const nextHidden = !(template?.hidden ?? false);
    try {
      if (template) {
        await fetch(`/api/badge-templates/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden: nextHidden }),
        });
      } else {
        await fetch(`/api/badge-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "chore_level",
            choreId,
            hidden: nextHidden,
          }),
        });
      }
      fetchTemplates();
    } catch (error) {
      console.error("Failed to toggle badge visibility:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-[rgba(68,55,32,0.06)] rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (chores.length === 0) {
    return (
      <div className="text-center py-8 text-[#857d68]">
        <p>{tChores("noChoresYet")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {chores.map((chore) => {
          const template = getTemplateForChore(chore.id);
          const hasCustomization = !!template?.imageUrl;
          const isHidden = template?.hidden === true;

          return (
            <div
              key={chore.id}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                isHidden
                  ? "border-dashed border-[rgba(68,55,32,0.25)] bg-[rgba(68,55,32,0.04)] opacity-70"
                  : hasCustomization
                  ? "border-[#6b8e4e] bg-[rgba(107,142,78,0.06)]"
                  : "border-[rgba(68,55,32,0.14)] bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleVisibility(chore.id, template)}
                aria-label={isHidden ? "Show to kids" : "Hide from kids"}
                title={isHidden ? "Show to kids" : "Hide from kids"}
                className="absolute top-1 right-1 p-1 rounded-md text-pg-muted hover:text-pg-ink hover:bg-pg-cream transition-colors"
              >
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>

              {hasCustomization && !isHidden && (
                <div className="absolute top-1 left-1 w-2 h-2 bg-[#6b8e4e] rounded-full" />
              )}

              <button
                type="button"
                onClick={() => handleChoreClick(chore)}
                className="block w-full text-left"
              >
                <div className="flex justify-center mb-2">
                  <BadgeIcon
                    imageUrl={template?.imageUrl}
                    emoji={template?.icon || chore.icon}
                    size="lg"
                    alt={chore.title}
                  />
                </div>
                <div className="text-sm font-medium text-[#2f2a1f] text-center truncate">
                  {chore.title}
                </div>
                <div className="text-xs text-[#857d68] text-center mt-1">
                  {isHidden
                    ? "Hidden from kids"
                    : hasCustomization
                    ? t("customImage")
                    : t("builtInBadge")}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {selectedChore && (
        <BadgeTemplateForm
          type="chore_level"
          choreId={selectedChore.chore.id}
          template={selectedChore.template}
          chore={selectedChore.chore}
          onClose={() => setSelectedChore(null)}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
