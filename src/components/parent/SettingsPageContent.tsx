"use client";

import { useTranslations } from "next-intl";
import FamilyInviteCode from "@/components/family/FamilyInviteCode";
import BadgeManagementTabs from "@/components/settings/BadgeManagementTabs";

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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
        <p className="text-gray-500 mt-1">{t("pageDesc")}</p>
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
    </>
  );
}
