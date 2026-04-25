"use client";

import { useTranslations } from "next-intl";

export default function ChoresPageHeader() {
  const t = useTranslations("parent");

  return (
    <div className="mb-8">
      <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
        Points System
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl md:text-[32px] font-medium text-pg-ink leading-tight tracking-tight">
        {t("choresTitle")}
      </h1>
      <p className="mt-2 text-pg-muted">{t("choresDesc")}</p>
    </div>
  );
}
