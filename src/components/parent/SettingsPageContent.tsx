"use client";

import { useTranslations } from "next-intl";
import FamilyInviteCode from "@/components/family/FamilyInviteCode";
import BadgeManagementTabs from "@/components/settings/BadgeManagementTabs";
import PhotoStorageCard from "@/components/settings/PhotoStorageCard";
import SignOutCard from "@/components/settings/SignOutCard";
import KidsManager, { type ManagedKid } from "@/components/settings/KidsManager";
import ParentTabBar from "@/components/v2/ParentTabBar";

type Props = {
  familyName: string;
  inviteCode: string;
  kids: ManagedKid[];
};

export default function SettingsPageContent({ familyName, inviteCode, kids }: Props) {
  const t = useTranslations("settings");

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
              <KidsManager kids={kids} />
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

        <PhotoStorageCard />

        {/* Badge Management */}
        <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
          <BadgeManagementTabs />
        </div>

        <SignOutCard />
      </div>

      <ParentTabBar />
    </div>
  );
}
