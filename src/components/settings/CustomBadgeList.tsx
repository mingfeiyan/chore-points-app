"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  ruleConfig: Record<string, unknown> | null;
};

export default function CustomBadgeList() {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<BadgeTemplate | null>(null);
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
        // Filter only custom badges
        const customBadges = (data.templates || []).filter(
          (t: BadgeTemplate) => t.type === "custom"
        );
        setTemplates(customBadges);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteBadge"))) return;

    try {
      const response = await fetch(`/api/badge-templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleFormSuccess = () => {
    fetchTemplates();
    setShowForm(false);
    setSelectedTemplate(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2].map((i) => (
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
      {/* Add Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("createCustomBadge")}
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">🏅</div>
          <p className="text-gray-500">{t("noBadgeTemplates")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("addFirstBadge")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="relative p-4 rounded-lg border-2 border-gray-200 bg-white hover:shadow-md transition-all"
            >
              {/* Badge Icon */}
              <div className="flex justify-center mb-2">
                <BadgeIcon
                  imageUrl={template.imageUrl}
                  emoji={template.icon}
                  size="lg"
                  alt={template.name || "Badge"}
                />
              </div>

              {/* Badge Name */}
              <div className="text-sm font-medium text-gray-900 text-center truncate">
                {locale === "zh"
                  ? template.nameZh || template.name
                  : template.name || template.nameZh}
              </div>

              {/* Description */}
              <div className="text-xs text-gray-500 text-center truncate mt-1">
                {locale === "zh"
                  ? template.descriptionZh || template.description
                  : template.description || template.descriptionZh}
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-50 rounded"
                >
                  {t("customizeBadge")}
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showForm || selectedTemplate) && (
        <BadgeTemplateForm
          type="custom"
          template={selectedTemplate || undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedTemplate(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
