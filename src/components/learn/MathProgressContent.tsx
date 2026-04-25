"use client";

import { useTranslations } from "next-intl";
import MathAnalytics from "./MathAnalytics";

type Kid = { id: string; name: string | null };

type Props = {
  kids: Kid[];
};

export default function MathProgressContent({ kids }: Props) {
  const t = useTranslations("learn");

  if (kids.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          Learning Center
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl md:text-[32px] font-medium text-pg-ink leading-tight tracking-tight">
          {t("mathProgress")}
        </h1>
        <p className="mt-4 text-pg-muted">{t("noKidsYet")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
        Learning Center
      </p>
      <h1 className="mt-1 mb-6 font-[family-name:var(--font-fraunces)] text-2xl md:text-[32px] font-medium text-pg-ink leading-tight tracking-tight">
        {t("mathProgress")}
      </h1>
      <MathAnalytics kids={kids} defaultKidId={kids[0].id} />
    </div>
  );
}
