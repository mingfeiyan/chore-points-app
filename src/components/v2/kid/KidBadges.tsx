"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import BadgeFrame from "@/components/v2/BadgeFrame";

type Badge = {
  id: string;
  level: number;
  count: number;
  chore: { id: string; title: string; icon: string | null } | null;
  customImageUrl: string | null;
  customIcon: string | null;
  levelName: string | null;
  earnedAt?: string;
};

type AchievementBadge = {
  id: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  customImageUrl: string | null;
  earnedAt: string;
};

type AllAchievementBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  customImageUrl: string | null;
};

type FilterCategory = "all" | "chores" | "learn" | "streaks";

export default function KidBadges() {
  const { data: session } = useSession();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievementBadges, setAchievementBadges] = useState<AchievementBadge[]>([]);
  const [allAchievementBadges, setAllAchievementBadges] = useState<AllAchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [selectedBadge, setSelectedBadge] = useState<{
    name: string;
    description: string;
    imageUrl: string | null;
    icon: string;
    earned: boolean;
    date?: string;
  } | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchBadges();
  }, [session?.user?.id]);

  const fetchBadges = async () => {
    try {
      const res = await fetch(`/api/badges?kidId=${session?.user?.id}`);
      const data = await res.json();
      if (res.ok) {
        setBadges(data.badges || []);
        setAchievementBadges(data.achievementBadges || []);
        setAllAchievementBadges(data.allAchievementBadges || []);
      }
    } catch (err) {
      console.error("Failed to fetch badges:", err);
    } finally {
      setLoading(false);
    }
  };

  const earnedCount = badges.length + achievementBadges.length;
  const totalCount = badges.length + allAchievementBadges.length;

  // Build display list
  const displayItems = (() => {
    const items: Array<{
      key: string;
      content: string;
      earned: boolean;
      tier: number;
      name: string;
      description: string;
      icon: string;
      date?: string;
      category: "chores" | "learn" | "streaks";
    }> = [];

    // Chore badges
    for (const badge of badges) {
      items.push({
        key: `chore-${badge.id}`,
        content: badge.customImageUrl || badge.customIcon || badge.chore?.icon || "🏆",
        earned: true,
        tier: badge.level,
        name: badge.chore?.title || "Chore Badge",
        description: `Level ${badge.level} - Completed ${badge.count} times`,
        icon: badge.chore?.icon || "🏆",
        category: "chores",
      });
    }

    // Achievement badges (earned)
    const earnedIds = new Set(achievementBadges.map((b) => b.badgeId));
    for (const badge of achievementBadges) {
      const isStreak = badge.badgeId.includes("streak") || badge.badgeId.includes("consistent");
      items.push({
        key: `ach-${badge.id}`,
        content: badge.customImageUrl || badge.icon,
        earned: true,
        tier: 3,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        date: badge.earnedAt,
        category: isStreak ? "streaks" : "learn",
      });
    }

    // Unearned achievement badges
    for (const badge of allAchievementBadges) {
      if (earnedIds.has(badge.id)) continue;
      const isStreak = badge.id.includes("streak") || badge.id.includes("consistent");
      items.push({
        key: `locked-${badge.id}`,
        content: badge.customImageUrl || badge.icon,
        earned: false,
        tier: 0,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: isStreak ? "streaks" : "learn",
      });
    }

    if (filter === "all") return items;
    return items.filter((item) => item.category === filter);
  })();

  const filters: { label: string; value: FilterCategory }[] = [
    { label: "All", value: "all" },
    { label: "Chores", value: "chores" },
    { label: "Learn", value: "learn" },
    { label: "Streaks", value: "streaks" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-ca-cream flex items-center justify-center">
        <div className="text-ca-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ca-cream pb-20 font-[family-name:var(--font-nunito)]">
      <KidHeaderBG compact>
        <div className="text-center">
          <h1 className="text-2xl font-black font-[family-name:var(--font-baloo-2)]">
            My Badges
          </h1>
          <p className="text-sm opacity-80 mt-1">
            {earnedCount} of {totalCount} earned
          </p>
        </div>
      </KidHeaderBG>

      <div className="px-4 mt-4">
        {/* Filter pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                filter === f.value
                  ? "bg-ca-cobalt text-white"
                  : "bg-white/60 text-ca-ink border border-ca-divider"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-3 gap-4">
          {displayItems.map((item) => (
            <button
              key={item.key}
              className="flex flex-col items-center gap-1"
              onClick={() =>
                setSelectedBadge({
                  name: item.name,
                  description: item.description,
                  imageUrl: typeof item.content === "string" && item.content.startsWith("http") ? item.content : null,
                  icon: item.icon,
                  earned: item.earned,
                  date: item.date,
                })
              }
            >
              <BadgeFrame
                content={item.content}
                earned={item.earned}
                tier={item.tier}
                size={80}
              />
              <span className="text-[11px] font-bold text-ca-ink text-center leading-tight line-clamp-2">
                {item.name}
              </span>
            </button>
          ))}
        </div>

        {displayItems.length === 0 && (
          <div className="text-center py-12 text-ca-muted">
            <p>No badges in this category yet.</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-8"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <BadgeFrame
                content={selectedBadge.imageUrl || selectedBadge.icon}
                earned={selectedBadge.earned}
                tier={selectedBadge.earned ? 3 : 0}
                size={120}
              />
            </div>
            <h3 className="text-lg font-bold text-ca-ink text-center">{selectedBadge.name}</h3>
            <p className="text-sm text-ca-muted text-center mt-1">{selectedBadge.description}</p>
            {selectedBadge.earned && selectedBadge.date && (
              <p className="text-xs text-ca-muted text-center mt-2">
                Earned {new Date(selectedBadge.date).toLocaleDateString()}
              </p>
            )}
            {!selectedBadge.earned && (
              <p className="text-xs text-ca-muted text-center mt-2 italic">Not yet earned</p>
            )}
            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-4 w-full py-2 bg-ca-cobalt text-white rounded-xl font-bold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <KidTabBar />
    </div>
  );
}
