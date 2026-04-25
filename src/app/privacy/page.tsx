"use client";

import { useTranslations } from "next-intl";
import LegalPage from "@/components/legal/LegalPage";

const LAST_UPDATED = "April 25, 2026";

export default function PrivacyPage() {
  const t = useTranslations("legal");

  const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    title: t(`privacySection${n}Title`),
    body: t(`privacySection${n}`),
  }));

  return (
    <LegalPage
      title={t("privacyTitle")}
      lastUpdated={t("lastUpdated", { date: LAST_UPDATED })}
      intro={t("privacyIntro")}
      sections={sections}
    />
  );
}
