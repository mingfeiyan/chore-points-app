"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AchievementBadgeTemplateList from "./AchievementBadgeTemplateList";
import ChoreBadgeTemplateList from "./ChoreBadgeTemplateList";
import CustomBadgeList from "./CustomBadgeList";

type Tab = "achievement" | "chore" | "custom";

export default function BadgeManagementTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("achievement");
  const t = useTranslations("badges");

  const tabs = [
    { id: "achievement" as Tab, label: t("achievementBadges") },
    { id: "chore" as Tab, label: t("choreBadges") },
    { id: "custom" as Tab, label: t("customBadges") },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("manageBadges")}
      </h2>
      <p className="text-sm text-gray-500 mb-4">{t("manageBadgesDesc")}</p>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "achievement" && <AchievementBadgeTemplateList />}
        {activeTab === "chore" && <ChoreBadgeTemplateList />}
        {activeTab === "custom" && <CustomBadgeList />}
      </div>
    </div>
  );
}
