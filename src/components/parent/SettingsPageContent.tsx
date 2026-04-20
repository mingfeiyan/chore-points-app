"use client";

import { useTranslations } from "next-intl";
import { useNewDesign } from "@/hooks/useNewDesign";
import FamilyInviteCode from "@/components/family/FamilyInviteCode";
import BadgeManagementTabs from "@/components/settings/BadgeManagementTabs";
import ParentTabBar from "@/components/v2/ParentTabBar";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  familyName: string;
  inviteCode: string;
  kids: Kid[];
};

export default function SettingsPageContent({ familyName, inviteCode, kids }: Props) {
  const t = useTranslations("settings");
  const tParent = useTranslations("parent");
  const { isNewDesign, setNewDesign } = useNewDesign();

  if (isNewDesign) {
    return (
      <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
        {/* Header */}
        <div className="px-7 pt-8 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
            {t("pageTitle")}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-medium text-pg-ink">
            {t("pageDesc")}
          </h1>
        </div>

        <div className="px-7 space-y-4 mt-4">
          {/* New Design Toggle */}
          <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-pg-ink">
                  {t("newDesignToggle")}
                </h2>
                <p className="text-sm text-pg-muted mt-1">{t("newDesignDesc")}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isNewDesign}
                onClick={() => setNewDesign(!isNewDesign)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isNewDesign ? "bg-pg-accent" : "bg-[rgba(68,55,32,0.2)]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isNewDesign ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Family Info Card */}
          <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
            <h2 className="text-base font-semibold text-pg-ink mb-4">
              {t("familyInfo")}
            </h2>

            <div className="space-y-4">
              {/* Family Name */}
              <div className="flex items-center justify-between py-3 border-b border-[rgba(68,55,32,0.08)]">
                <div>
                  <div className="text-xs font-medium text-pg-muted uppercase tracking-wide">{t("familyName")}</div>
                  <div className="font-semibold text-pg-ink mt-0.5">{familyName}</div>
                </div>
              </div>

              {/* Family Members */}
              <div className="py-3 border-b border-[rgba(68,55,32,0.08)]">
                <div className="text-xs font-medium text-pg-muted uppercase tracking-wide mb-2">{t("familyMembers")}</div>
                {kids.length === 0 ? (
                  <p className="text-pg-muted text-sm">{tParent("noKidsYet")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {kids.map((kid) => (
                      <span
                        key={kid.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(107,142,78,0.1)] text-pg-accent-deep rounded-full text-sm font-medium"
                      >
                        <span className="w-5 h-5 rounded-full bg-pg-accent text-white flex items-center justify-center text-[10px] font-bold">
                          {(kid.name || kid.email)[0].toUpperCase()}
                        </span>
                        {kid.name || kid.email}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Code */}
              <div className="py-3">
                <div className="text-xs font-medium text-pg-muted uppercase tracking-wide mb-3">{t("inviteCode")}</div>
                <div className="bg-pg-cream rounded-xl p-4">
                  <FamilyInviteCode inviteCode={inviteCode} />
                </div>
                <p className="text-xs text-pg-muted mt-2">{t("inviteCodeHint")}</p>
              </div>
            </div>
          </div>

          {/* Badge Management */}
          <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
            <BadgeManagementTabs />
          </div>
        </div>

        <ParentTabBar />
      </div>
    );
  }

  // --- Old design ---
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
        <p className="text-gray-500 mt-1">{t("pageDesc")}</p>
      </div>

      {/* New Design Toggle */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("newDesignToggle")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t("newDesignDesc")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isNewDesign}
            onClick={() => setNewDesign(!isNewDesign)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
              isNewDesign ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isNewDesign ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Family Info Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("familyInfo")}
        </h2>

        <div className="space-y-4">
          {/* Family Name */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm text-gray-500">{t("familyName")}</div>
              <div className="font-medium text-gray-900">{familyName}</div>
            </div>
          </div>

          {/* Family Members */}
          <div className="py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500 mb-2">{t("familyMembers")}</div>
            {kids.length === 0 ? (
              <p className="text-gray-500 text-sm">{tParent("noKidsYet")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {kids.map((kid) => (
                  <span
                    key={kid.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    <span>👤</span>
                    {kid.name || kid.email}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Invite Code */}
          <div className="py-3">
            <div className="text-sm text-gray-500 mb-3">{t("inviteCode")}</div>
            <div className="bg-gray-50 rounded-lg p-4">
              <FamilyInviteCode inviteCode={inviteCode} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{t("inviteCodeHint")}</p>
          </div>
        </div>
      </div>

      {/* Badge Management */}
      <BadgeManagementTabs />
    </div>
  );
}
