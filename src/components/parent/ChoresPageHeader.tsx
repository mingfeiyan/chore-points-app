"use client";

import { useTranslations } from "next-intl";

export default function ChoresPageHeader() {
  const t = useTranslations("parent");

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">{t("choresTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("choresDesc")}</p>
    </div>
  );
}
