"use client";

import { useTranslations } from "next-intl";

export default function RedeemHeader() {
  const t = useTranslations("rewards");

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{t("redeemRewards")}</h1>
      <p className="mt-2 text-gray-600">{t("usePoints")}</p>
    </div>
  );
}
