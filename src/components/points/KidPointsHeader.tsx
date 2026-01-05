"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function KidPointsHeader() {
  const t = useTranslations("points");

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("myPoints")}</h1>
        <p className="mt-2 text-gray-600">
          {t("trackPoints")}
        </p>
      </div>
      <Link
        href="/redeem"
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
      >
        {t("redeemRewards")}
      </Link>
    </div>
  );
}
