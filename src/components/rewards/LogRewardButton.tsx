"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import LogRewardModal from "./LogRewardModal";

export default function LogRewardButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("logReward");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-sm"
      >
        <span className="text-lg">🎁</span>
        <span>{t("button")}</span>
      </button>
      {open && (
        <LogRewardModal
          onClose={() => setOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}
