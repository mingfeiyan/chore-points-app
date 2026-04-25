"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AddKidInline from "./AddKidInline";

export type ManagedKid = {
  id: string;
  name: string | null;
  email: string;
  counts: {
    pointEntries: number;
    photos: number;
    badges: number;
    redemptions: number;
  };
};

export default function KidsManager({ kids }: { kids: ManagedKid[] }) {
  const t = useTranslations("settings.kids");
  const tParent = useTranslations("parent");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = kids.find((k) => k.id === editingId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center">
        {kids.length === 0 ? (
          <p className="text-pg-muted text-sm">{tParent("noKidsYet")}</p>
        ) : (
          kids.map((kid) => {
            const display = kid.name || kid.email;
            const isSyntheticEmail = kid.email.endsWith("@local.gemsteps.app");
            const isActive = editingId === kid.id;
            return (
              <button
                key={kid.id}
                type="button"
                onClick={() => setEditingId(isActive ? null : kid.id)}
                title={isSyntheticEmail ? t("profileOnlyHint") : kid.email}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-pg-accent-deep text-white"
                    : "bg-[rgba(107,142,78,0.1)] text-pg-accent-deep hover:bg-[rgba(107,142,78,0.18)]"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? "bg-white text-pg-accent-deep" : "bg-pg-accent text-white"
                  }`}
                >
                  {display[0].toUpperCase()}
                </span>
                {isSyntheticEmail ? kid.name || "Kid" : display}
              </button>
            );
          })
        )}
        <AddKidInline />
      </div>

      {editing && (
        <KidEditor
          kid={editing}
          onClose={() => setEditingId(null)}
          onMutated={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function KidEditor({
  kid,
  onClose,
  onMutated,
}: {
  kid: ManagedKid;
  onClose: () => void;
  onMutated: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("settings.kids");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(kid.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === (kid.name ?? "")) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/kids/${kid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("renameFailed"));
        setBusy(false);
        return;
      }
      router.refresh();
      onMutated();
    } catch {
      setError(t("renameFailed"));
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/kids/${kid.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("removeFailed"));
        setBusy(false);
        return;
      }
      router.refresh();
      onMutated();
    } catch {
      setError(t("removeFailed"));
      setBusy(false);
    }
  };

  const totalActivity =
    kid.counts.pointEntries + kid.counts.photos + kid.counts.badges + kid.counts.redemptions;

  return (
    <div className="mt-3 rounded-xl border border-[rgba(68,55,32,0.14)] bg-pg-cream p-4">
      <div className="text-xs font-medium text-pg-muted uppercase tracking-wide mb-2">
        {t("editing")}: <span className="text-pg-ink">{kid.name || "Kid"}</span>
      </div>

      <form onSubmit={handleRename} className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          disabled={busy}
          className="flex-1 min-w-[8rem] px-3 py-1.5 text-sm border border-pg-line rounded-full focus:outline-none focus:ring-2 focus:ring-pg-accent focus:border-pg-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="px-4 py-1.5 text-sm font-semibold bg-pg-accent-deep text-white rounded-full hover:bg-[#3d5a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? t("saving") : tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-3 py-1.5 text-sm text-pg-muted hover:text-pg-ink"
        >
          {tCommon("cancel")}
        </button>
      </form>

      {error && <p className="text-xs text-pg-coral mt-2">{error}</p>}

      <div className="mt-4 pt-4 border-t border-[rgba(68,55,32,0.08)]">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="text-sm font-medium text-pg-coral hover:underline disabled:opacity-50"
          >
            {t("removeKid")}
          </button>
        ) : (
          <div>
            <p className="text-sm text-pg-ink mb-1 font-semibold">
              {t("confirmRemove", { name: kid.name || "this kid" })}
            </p>
            <p className="text-xs text-pg-muted mb-3">
              {totalActivity === 0
                ? t("removeNoActivity")
                : t("removeWithActivity", {
                    entries: kid.counts.pointEntries,
                    photos: kid.counts.photos,
                    badges: kid.counts.badges,
                    redemptions: kid.counts.redemptions,
                  })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="px-4 py-1.5 text-sm font-semibold bg-pg-coral text-white rounded-full hover:bg-[#a53e2c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? t("removing") : t("removePermanently")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="px-3 py-1.5 text-sm text-pg-muted hover:text-pg-ink"
              >
                {tCommon("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
