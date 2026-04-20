"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useNewDesign } from "@/hooks/useNewDesign";
import AchievementBadgeTemplateList from "./AchievementBadgeTemplateList";
import ChoreBadgeTemplateList from "./ChoreBadgeTemplateList";
import CustomBadgeList from "./CustomBadgeList";

type Tab = "achievement" | "chore" | "custom";

export default function BadgeManagementTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("achievement");
  const t = useTranslations("badges");
  const { isNewDesign } = useNewDesign();

  const theme = isNewDesign ? {
    card: "bg-white border border-[rgba(68,55,32,0.14)] rounded-[14px]",
    title: "text-[#2f2a1f]",
    desc: "text-[#857d68]",
    tabBorder: "border-[rgba(68,55,32,0.14)]",
    tabActive: "border-[#4a6a32] text-[#4a6a32]",
    tabInactive: "border-transparent text-[#857d68] hover:text-[#2f2a1f] hover:border-[rgba(68,55,32,0.25)]",
  } : {
    card: "bg-white shadow rounded-lg",
    title: "text-gray-900",
    desc: "text-gray-500",
    tabBorder: "border-gray-200",
    tabActive: "border-purple-500 text-purple-600",
    tabInactive: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
  };

  const tabs = [
    { id: "achievement" as Tab, label: t("achievementBadges") },
    { id: "chore" as Tab, label: t("choreBadges") },
    { id: "custom" as Tab, label: t("customBadges") },
  ];

  return (
    <div className={`${theme.card} p-6`}>
      <h2 className={`text-lg font-semibold ${theme.title} mb-4`}>
        {t("manageBadges")}
      </h2>
      <p className={`text-sm ${theme.desc} mb-4`}>{t("manageBadgesDesc")}</p>

      {/* Tabs */}
      <div className={`border-b ${theme.tabBorder} mb-4`}>
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? theme.tabActive
                    : theme.tabInactive
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
