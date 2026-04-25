"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AddKidInline() {
  const router = useRouter();
  const t = useTranslations("settings.addKid");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/family/kids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("addFailed"));
        setBusy(false);
        return;
      }
      setName("");
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("addFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-pg-line text-pg-muted hover:border-pg-accent hover:text-pg-accent-deep hover:bg-[rgba(107,142,78,0.06)] transition-colors"
      >
        + {t("addKid")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleAdd}
      className="flex items-center gap-2 flex-wrap mt-2 w-full"
    >
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        maxLength={60}
        disabled={busy}
        className="flex-1 min-w-[8rem] px-3 py-1.5 text-sm border border-pg-line rounded-full focus:outline-none focus:ring-2 focus:ring-pg-accent focus:border-pg-accent disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="px-4 py-1.5 text-sm font-semibold bg-pg-accent-deep text-white rounded-full hover:bg-[#3d5a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? t("adding") : tCommon("add")}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
          setError(null);
        }}
        disabled={busy}
        className="px-3 py-1.5 text-sm text-pg-muted hover:text-pg-ink"
      >
        {tCommon("cancel")}
      </button>
      {error && (
        <p className="w-full text-xs text-pg-coral mt-1">{error}</p>
      )}
    </form>
  );
}
