"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ResultsPageHeader() {
  const t = useTranslations("meals");

  return (
    <>
      <div className="flex items-center gap-4 mb-2">
        <Link
          href="/meals"
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900">{t("resultsTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("resultsDesc")}</p>
    </>
  );
}
