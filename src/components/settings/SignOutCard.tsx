"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function SignOutCard() {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const t = useTranslations("settings.account");

  const handleSignOut = async () => {
    setBusy(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
      <h2 className="text-base font-semibold text-pg-ink mb-1">{t("title")}</h2>
      <p className="text-sm text-pg-muted mb-4">{t("description")}</p>

      <div className="rounded-xl border border-[rgba(68,55,32,0.08)] p-4 mb-4 bg-pg-cream flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-pg-muted uppercase tracking-wide mb-1">
            {t("signedInAs")}
          </div>
          <div className="font-semibold text-pg-ink truncate">
            {session?.user?.name || session?.user?.email || "—"}
          </div>
          {session?.user?.name && session?.user?.email && (
            <div className="text-xs text-pg-muted mt-0.5 truncate">
              {session.user.email}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-pg-coral text-pg-coral rounded-lg hover:bg-[rgba(197,84,61,0.08)] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? t("signingOut") : t("signOut")}
      </button>
    </div>
  );
}
