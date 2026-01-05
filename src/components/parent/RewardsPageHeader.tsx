"use client";

import { useTranslations } from "next-intl";

export default function RewardsPageHeader() {
  const t = useTranslations("parent");

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900">{t("rewardsTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("rewardsDesc")}</p>
    </>
  );
}
