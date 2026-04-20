"use client";

import { useEffect, useState } from "react";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";

// ------- Types -------

interface Kid {
  id: string;
  name: string;
}

interface PointEntry {
  id: string;
  points: number;
  date: string;
  createdAt: string;
  note: string | null;
  chore?: { title: string } | null;
  redemption?: { reward?: { title: string } | null } | null;
}

interface ParentLedgerProps {
  kids: Kid[];
}

// ------- Helpers -------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ------- Component -------

export default function ParentLedger({ kids }: ParentLedgerProps) {
  const [selectedKidId, setSelectedKidId] = useState(kids[0]?.id || "");
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedKidId) return;
    setLoading(true);

    fetch(`/api/points?kidId=${selectedKidId}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries || []);
        setTotalPoints(data.totalPoints || 0);
      })
      .catch((err) => console.error("Failed to fetch ledger:", err))
      .finally(() => setLoading(false));
  }, [selectedKidId]);

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="px-7 pt-7">
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          Points Ledger
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
          Track and <em className="text-pg-accent-deep">tend</em> the rewards
        </h1>
        <p className="mt-1 text-sm text-pg-muted">
          Review point history for each child
        </p>
      </div>

      {/* Kid switcher chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-7 pb-1">
        {kids.map((kid) => {
          const isSelected = kid.id === selectedKidId;
          return (
            <button
              key={kid.id}
              type="button"
              onClick={() => setSelectedKidId(kid.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-[10px] border px-4 py-2.5 text-sm transition-colors ${
                isSelected
                  ? "border-pg-accent bg-white font-bold text-pg-ink"
                  : "border-[rgba(68,55,32,0.14)] bg-transparent text-pg-muted"
              }`}
            >
              <span>{kid.name}</span>
              {isSelected && (
                <>
                  <CoinSmall size={14} />
                  <span className="text-xs">{totalPoints}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Transaction list */}
      <div className="mt-4 px-7">
        {loading ? (
          <div className="py-8 text-center text-pg-muted">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-pg-muted">
            No point entries yet
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[rgba(68,55,32,0.14)] bg-white">
            {entries.map((entry, i) => {
              const description =
                entry.chore?.title ||
                entry.redemption?.reward?.title ||
                entry.note ||
                "Points";
              const isPositive = entry.points > 0;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < entries.length - 1
                      ? "border-b border-[rgba(68,55,32,0.14)]"
                      : ""
                  }`}
                >
                  {/* Date */}
                  <span className="w-12 shrink-0 text-xs tabular-nums text-pg-muted">
                    {formatDate(entry.date || entry.createdAt)}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-pg-ink">
                      {description}
                    </p>
                    {entry.note && entry.chore?.title && (
                      <p className="truncate text-xs italic text-pg-muted">
                        {entry.note}
                      </p>
                    )}
                  </div>

                  {/* Points */}
                  <div className="flex shrink-0 items-center gap-1">
                    <CoinSmall size={14} />
                    <span
                      className={`text-sm font-medium ${
                        isPositive ? "text-pg-accent-deep" : "text-pg-coral"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {entry.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ParentTabBar />
    </div>
  );
}
