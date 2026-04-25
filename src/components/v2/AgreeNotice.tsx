"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AgreeNotice() {
  const tHome = useTranslations("home");
  return (
    <p className="text-center text-xs text-pg-muted">
      {tHome.rich("agreeNotice", {
        terms: (chunks) => (
          <Link href="/terms" className="font-semibold text-pg-accent-deep hover:underline">
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" className="font-semibold text-pg-accent-deep hover:underline">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
