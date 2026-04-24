"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AgreeNotice() {
  const tHome = useTranslations("home");
  return (
    <p
      className="text-center text-xs"
      style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
    >
      {tHome.rich("agreeNotice", {
        terms: (chunks) => (
          <Link href="/terms" className="font-bold" style={{ color: "var(--ca-cobalt-deep)" }}>
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" className="font-bold" style={{ color: "var(--ca-cobalt-deep)" }}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
