"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function PointsHistoryHeader() {
  const t = useTranslations("history");

  return (
    <div className="flex items-center gap-4 mb-6">
      <Link
        href="/points"
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Link>
      <h1 className="text-3xl font-bold text-gray-900">{t("pointsHistory")}</h1>
    </div>
  );
}
