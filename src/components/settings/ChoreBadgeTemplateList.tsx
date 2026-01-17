"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (chores.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
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

          return (
            <button
              key={chore.id}
              onClick={() => handleChoreClick(chore)}
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
                  emoji={template?.icon || chore.icon}
                  size="lg"
                  alt={chore.title}
                />
              </div>

              {/* Chore Title */}
              <div className="text-sm font-medium text-gray-900 text-center truncate">
                {chore.title}
              </div>

              {/* Status */}
              <div className="text-xs text-gray-500 text-center mt-1">
                {hasCustomization ? t("customImage") : t("builtInBadge")}
              </div>
            </button>
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
