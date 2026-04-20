"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import PointEntryForm from "@/components/points/PointEntryForm";
import BadgeLevelUpToast from "@/components/badges/BadgeLevelUpToast";
import AchievementBadgeToast from "@/components/badges/AchievementBadgeToast";

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
  photoUrl: string | null;
  chore: { title: string } | null;
  choreId?: string | null;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
  redemption: { reward: { title: string } } | null;
}

interface BadgeLevelUpInfo {
  choreTitle: string;
  choreIcon: string | null;
  newLevel: number;
  levelName: string | null;
  levelIcon: string | null;
  count: number;
  isFirstTime: boolean;
}

interface AchievementBadgeInfo {
  badgeId: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
}

interface ParentLedgerProps {
  kids: Kid[];
}

// ------- Helpers -------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ------- Component -------

export default function ParentLedger({ kids }: ParentLedgerProps) {
  const router = useRouter();
  const [selectedKidId, setSelectedKidId] = useState(kids[0]?.id || "");
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PointEntry | null>(null);
  const [badgeLevelUp, setBadgeLevelUp] = useState<BadgeLevelUpInfo | null>(null);
  const [achievementBadges, setAchievementBadges] = useState<AchievementBadgeInfo[]>([]);

  const selectedKid = kids.find((k) => k.id === selectedKidId) || null;

  const fetchPoints = (kidId: string) => {
    setLoading(true);
    fetch(`/api/points?kidId=${kidId}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries || []);
        setTotalPoints(data.totalPoints || 0);
      })
      .catch((err) => console.error("Failed to fetch ledger:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedKidId) fetchPoints(selectedKidId);
  }, [selectedKidId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this point entry?")) return;
    try {
      const res = await fetch(`/api/points/${id}`, { method: "DELETE" });
      if (res.ok && selectedKidId) fetchPoints(selectedKidId);
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const handleEdit = (entry: PointEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleFormSuccess = (
    levelUpInfo?: BadgeLevelUpInfo | null,
    newAchievementBadges?: AchievementBadgeInfo[] | null
  ) => {
    if (selectedKidId) fetchPoints(selectedKidId);
    handleFormClose();
    if (levelUpInfo) setBadgeLevelUp(levelUpInfo);
    if (newAchievementBadges && newAchievementBadges.length > 0) {
      setAchievementBadges(newAchievementBadges);
    }
  };

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="px-7 pt-7 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
            Points Ledger
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
            Track and <em className="text-pg-accent-deep">tend</em> the rewards
          </h1>
        </div>
        <button
          onClick={() => { setEditingEntry(null); setShowForm(true); }}
          disabled={!selectedKid}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
        >
          <Plus size={16} />
          Add Points
        </button>
      </div>

      {/* Kid switcher chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-7 pb-1">
        {kids.map((kid) => {
          const isSelected = kid.id === selectedKidId;
          return (
            <button
              key={kid.id}
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
                  <span className="text-xs font-semibold text-pg-accent-deep">{totalPoints}</span>
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
          <div className="py-8 text-center text-pg-muted">No point entries yet</div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-[rgba(68,55,32,0.14)] bg-white">
            {entries.map((entry, i) => {
              const description =
                entry.chore?.title ||
                entry.redemption?.reward?.title ||
                entry.note ||
                "Points";
              const isPositive = entry.points > 0;
              const addedBy = entry.createdBy?.name || entry.createdBy?.email || "";

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < entries.length - 1 ? "border-b border-[rgba(68,55,32,0.08)]" : ""
                  }`}
                >
                  {/* Date */}
                  <div className="w-14 shrink-0">
                    <span className="text-xs tabular-nums text-pg-muted">
                      {formatDate(entry.date || entry.createdAt)}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-pg-ink">{description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.note && entry.chore?.title && (
                        <span className="truncate text-xs italic text-pg-muted">{entry.note}</span>
                      )}
                      {addedBy && (
                        <span className="text-[10px] text-pg-muted">by {addedBy}</span>
                      )}
                    </div>
                  </div>

                  {/* Photo indicator */}
                  {entry.photoUrl && (
                    <span className="text-sm">📷</span>
                  )}

                  {/* Points */}
                  <div className="flex shrink-0 items-center gap-1">
                    <CoinSmall size={14} />
                    <span
                      className={`text-sm font-semibold ${
                        isPositive ? "text-pg-accent-deep" : "text-pg-coral"
                      }`}
                    >
                      {isPositive ? "+" : ""}{entry.points}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="rounded-lg p-1.5 text-pg-muted hover:text-pg-accent-deep hover:bg-[rgba(107,142,78,0.08)] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-lg p-1.5 text-pg-muted hover:text-pg-coral hover:bg-[rgba(197,84,61,0.08)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PointEntryForm modal (add/edit) */}
      {showForm && selectedKid && (
        <PointEntryForm
          kid={{ ...selectedKid, email: "" }}
          entry={editingEntry}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Badge level-up toast */}
      {badgeLevelUp && (
        <BadgeLevelUpToast
          {...badgeLevelUp}
          onClose={() => setBadgeLevelUp(null)}
        />
      )}

      {/* Achievement badge toasts */}
      {achievementBadges.length > 0 && (
        <AchievementBadgeToast
          badges={achievementBadges}
          onClose={() => setAchievementBadges([])}
        />
      )}

      <ParentTabBar />
    </div>
  );
}
