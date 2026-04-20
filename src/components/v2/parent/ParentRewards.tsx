"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import LogRewardModal from "@/components/rewards/LogRewardModal";
import OptimizedImage from "@/components/ui/OptimizedImage";

interface Kid {
  id: string;
  name: string | null;
  email: string;
}

interface RewardEntry {
  id: string;
  points: number;
  note: string | null;
  photoUrl: string | null;
  date: string;
  createdAt: string;
  kidId?: string;
  kidName: string;
}

export default function ParentRewards() {
  const router = useRouter();
  const [rewards, setRewards] = useState<RewardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<RewardEntry | null>(null);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const kidsRes = await fetch("/api/family/kids");
      const kidsData = await kidsRes.json();
      if (!kidsRes.ok || !Array.isArray(kidsData.kids)) return;

      const allRewards: RewardEntry[] = [];
      await Promise.all(
        kidsData.kids.map(async (kid: Kid) => {
          const res = await fetch(`/api/points?kidId=${kid.id}`);
          const data = await res.json();
          if (data.entries) {
            const kidRewards = data.entries
              .filter((e: { points: number }) => e.points < 0)
              .map((e: RewardEntry) => ({
                ...e,
                kidName: kid.name || kid.email,
              }));
            allRewards.push(...kidRewards);
          }
        })
      );

      allRewards.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRewards(allRewards);
    } catch (err) {
      console.error("Failed to fetch rewards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="px-7 pt-7 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
            Rewards
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
            Treats &amp; <em className="text-pg-accent-deep">celebrations</em>
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
        >
          <Plus size={16} />
          Log Reward
        </button>
      </div>

      {/* Reward history */}
      <div className="mt-5 px-7">
        {loading ? (
          <div className="py-12 text-center text-pg-muted">Loading...</div>
        ) : rewards.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-4xl">🎁</span>
            <p className="mt-3 text-pg-muted">No rewards logged yet</p>
            <p className="text-sm text-pg-muted mt-1">
              Tap &quot;Log Reward&quot; to record a treat or celebration
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[14px] border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Photo thumbnail or gift icon */}
                  {entry.photoUrl ? (
                    <button
                      onClick={() => setSelectedPhoto(entry)}
                      className="shrink-0 rounded-xl overflow-hidden"
                    >
                      <OptimizedImage
                        src={entry.photoUrl}
                        alt={entry.note || "Reward photo"}
                        variant="small"
                        className="w-16 h-16 object-cover rounded-xl"
                      />
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[rgba(107,142,78,0.08)] flex items-center justify-center shrink-0">
                      <span className="text-2xl">🎁</span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-pg-ink">
                      {entry.note || "Reward"}
                    </p>
                    <p className="text-xs text-pg-muted mt-0.5">
                      {entry.kidName} &middot;{" "}
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <CoinSmall size={14} />
                      <span className="text-sm font-semibold text-pg-coral">
                        {entry.points} pts
                      </span>
                    </div>
                  </div>

                  {/* Photo indicator */}
                  {entry.photoUrl && (
                    <button
                      onClick={() => setSelectedPhoto(entry)}
                      className="text-xs text-pg-accent-deep font-medium shrink-0"
                    >
                      View photo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      {selectedPhoto && selectedPhoto.photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="max-w-lg w-full rounded-[14px] bg-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <OptimizedImage
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.note || "Reward"}
              variant="large"
              className="w-full max-h-[60vh] object-contain bg-black"
            />
            <div className="p-4">
              <p className="font-semibold text-pg-ink">{selectedPhoto.note || "Reward"}</p>
              <p className="text-sm text-pg-muted mt-1">
                {selectedPhoto.kidName} &middot;{" "}
                {new Date(selectedPhoto.createdAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <CoinSmall size={14} />
                <span className="text-sm font-semibold text-pg-coral">{selectedPhoto.points} pts</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="w-full py-3 text-sm font-medium text-pg-muted border-t border-[rgba(68,55,32,0.14)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Log Reward Modal */}
      {showModal && (
        <LogRewardModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchRewards();
            router.refresh();
          }}
        />
      )}

      <ParentTabBar />
    </div>
  );
}
