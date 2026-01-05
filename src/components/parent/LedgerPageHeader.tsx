"use client";

import { useTranslations } from "next-intl";

export default function LedgerPageHeader() {
  const t = useTranslations("parent");

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">{t("ledgerTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("ledgerDesc")}</p>
    </div>
  );
}
