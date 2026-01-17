"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import BadgeImageUpload from "@/components/badges/BadgeImageUpload";
import BadgeIcon from "@/components/badges/BadgeIcon";

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

type BuiltInBadge = {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
};

type Chore = {
  id: string;
  title: string;
  icon: string | null;
};

type BadgeTemplateFormProps = {
  type: "achievement" | "chore_level" | "custom";
  builtInBadgeId?: string;
  choreId?: string;
  template?: BadgeTemplate;
  builtInBadge?: BuiltInBadge;
  chore?: Chore;
  onClose: () => void;
  onSuccess: () => void;
};

export default function BadgeTemplateForm({
  type,
  builtInBadgeId,
  choreId,
  template,
  builtInBadge,
  chore,
  onClose,
  onSuccess,
}: BadgeTemplateFormProps) {
  const [name, setName] = useState(template?.name || "");
  const [nameZh, setNameZh] = useState(template?.nameZh || "");
  const [description, setDescription] = useState(template?.description || "");
  const [descriptionZh, setDescriptionZh] = useState(
    template?.descriptionZh || ""
  );
  const [imageUrl, setImageUrl] = useState(template?.imageUrl || "");
  const [icon, setIcon] = useState(template?.icon || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = useTranslations("badges");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const isEditing = !!template;
  const isCustom = type === "custom";

  // Get display info based on type
  const getDisplayInfo = () => {
    if (builtInBadge) {
      return {
        name: locale === "zh" ? builtInBadge.nameZh : builtInBadge.name,
        description:
          locale === "zh"
            ? builtInBadge.descriptionZh
            : builtInBadge.description,
        icon: builtInBadge.icon,
      };
    }
    if (chore) {
      return {
        name: chore.title,
        description: "",
        icon: chore.icon || "✨",
      };
    }
    return {
      name: "",
      description: "",
      icon: "🏅",
    };
  };

  const displayInfo = getDisplayInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate custom badges
    if (isCustom && !name && !nameZh) {
      setError("Name is required for custom badges");
      return;
    }

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/badge-templates/${template.id}`
        : "/api/badge-templates";
      const method = isEditing ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: name || null,
        nameZh: nameZh || null,
        description: description || null,
        descriptionZh: descriptionZh || null,
        imageUrl: imageUrl || null,
        icon: icon || null,
      };

      // Only include type/identifiers when creating
      if (!isEditing) {
        body.type = type;
        if (builtInBadgeId) body.builtInBadgeId = builtInBadgeId;
        if (choreId) body.choreId = choreId;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Failed to save");
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!template) return;
    if (!confirm(t("confirmResetBadge"))) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/badge-templates/${template.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onSuccess();
      } else {
        setError("Failed to reset");
        setLoading(false);
      }
    } catch {
      setError("Failed to reset");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isCustom
              ? isEditing
                ? t("editCustomBadge")
                : t("createCustomBadge")
              : t("customizeBadge")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Preview current badge for non-custom */}
        {!isCustom && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
            <BadgeIcon
              imageUrl={imageUrl || template?.imageUrl}
              emoji={icon || template?.icon || displayInfo.icon}
              size="lg"
            />
            <div>
              <div className="font-medium text-gray-900">
                {displayInfo.name}
              </div>
              {displayInfo.description && (
                <div className="text-sm text-gray-500">
                  {displayInfo.description}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <BadgeImageUpload
            imageUrl={imageUrl}
            onImageChange={setImageUrl}
            label={t("badgeImage")}
          />

          {/* Fallback Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("badgeIcon")}
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder={displayInfo.icon}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Emoji shown when no image is set
            </p>
          </div>

          {/* Custom badge name fields */}
          {isCustom && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("badgeName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Super Helper"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("badgeNameZh")}
                </label>
                <input
                  type="text"
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  placeholder="e.g., 超级小帮手"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("badgeDescription")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how to earn this badge..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("badgeDescriptionZh")}
                </label>
                <textarea
                  value={descriptionZh}
                  onChange={(e) => setDescriptionZh(e.target.value)}
                  placeholder="描述如何获得这个徽章..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            {/* Reset button for existing templates */}
            {isEditing && !isCustom && (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50 font-medium disabled:opacity-50"
              >
                {t("resetToDefault")}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? tCommon("saving")
                : isCustom
                  ? isEditing
                    ? t("saveChanges")
                    : t("createBadge")
                  : t("saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
