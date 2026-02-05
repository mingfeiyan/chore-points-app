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
        <h1 className="text-2xl font-bold mb-4">{t("mathProgress")}</h1>
        <p className="text-gray-500">{t("noKidsYet")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("mathProgress")}</h1>
      <MathAnalytics kids={kids} defaultKidId={kids[0].id} />
    </div>
  );
}
