"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import LogRewardModal from "./LogRewardModal";

type Props = {
  variant?: "primary" | "secondary";
};

export default function LogRewardButton({ variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("logReward");

  const className =
    variant === "primary"
      ? "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-sm"
      : "inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 font-medium";

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
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
