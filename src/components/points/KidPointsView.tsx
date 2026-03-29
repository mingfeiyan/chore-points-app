"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ChoreFlashcards from "@/components/chores/ChoreFlashcards";
import PointsCalendar from "@/components/points/PointsCalendar";
import PointsCelebrationWrapper from "@/components/points/PointsCelebrationWrapper";
import BadgeShowcase from "@/components/badges/BadgeShowcase";

type PointEntry = {
  id: string;
  points: number;
  date: string;
  note?: string | null;
  photoUrl?: string | null;
  chore?: { title: string } | null;
};

// Extract emoji characters from a string
function extractEmojis(text: string): string[] {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  return [...(text.match(emojiRegex) || [])];
}

// Get the display emoji for a point entry
function getEntryEmoji(entry: PointEntry): string | null {
  if (entry.chore?.title) {
    const emojis = extractEmojis(entry.chore.title);
    if (emojis.length > 0) return emojis[0];
  }
  if (entry.note) {
    const emojis = extractEmojis(entry.note);
    if (emojis.length > 0) return emojis[0];
  }
  return null;
}

type KidPointsViewProps = {
  kidId: string;
  readOnly?: boolean;
};

// Animated particle for the rain effect — uses activity emoji if available
function RainParticle({ index, type, emoji }: { index: number; type: "gain" | "lose"; emoji: string }) {
  const left = Math.random() * 100;
  const delay = Math.random() * 0.8;
  const duration = 1.5 + Math.random() * 1;
  const size = 20 + Math.random() * 20;

  return (
    <span
      key={index}
      className={`absolute pointer-events-none ${type === "gain" ? "gem-rain" : "gem-fade"}`}
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        fontSize: `${size}px`,
        top: type === "gain" ? "-40px" : "50%",
      }}
    >
      {emoji}
    </span>
  );
}

export default function KidPointsView({ kidId, readOnly = false }: KidPointsViewProps) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [animationType, setAnimationType] = useState<"gain" | "lose" | null>(null);
  const [rainEmoji, setRainEmoji] = useState("💎");
  const [showEmoji, setShowEmoji] = useState(false);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const prevTotalRef = useRef<number | null>(null);
  const t = useTranslations("points");
  const tCommon = useTranslations("common");
  const tBadges = useTranslations("badges");

  // Compute today's date and current week range (Mon-Sun) in PT
  const { todayFormatted, weekRangeFormatted } = useMemo(() => {
    const now = new Date();
    const ptNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const month = ptNow.getMonth() + 1;
    const date = ptNow.getDate();
    const day = ptNow.getDay(); // 0=Sun
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(ptNow);
    monday.setDate(ptNow.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      todayFormatted: `${month}/${date}`,
      weekRangeFormatted: `${fmt(monday)} - ${fmt(sunday)}`,
    };
  }, []);

  const fetchPoints = useCallback(async () => {
    try {
      const response = await fetch(`/api/points?kidId=${kidId}`);
      const data = await response.json();
      if (response.ok) {
        const newTotal = data.totalPoints;
        const newEntries: PointEntry[] = data.entries || [];
        if (data.totalEarned !== undefined) setTotalEarned(data.totalEarned);
        const prev = prevTotalRef.current;

        if (prev !== null && newTotal !== prev) {
          const type = newTotal > prev ? "gain" : "lose";

          // Get emoji from the most recent entry
          let emoji: string | null = null;
          if (type === "gain" && newEntries.length > 0) {
            emoji = getEntryEmoji(newEntries[0]);
          }

          if (emoji) {
            // Phase 1: Show big emoji for 2.5s, DON'T update points yet
            setRainEmoji(emoji);
            setShowEmoji(true);
            setEntries(newEntries);
            prevTotalRef.current = newTotal;

            // Phase 2: After emoji display, update points + counter animation
            setTimeout(() => {
              setShowEmoji(false);
              setTotalPoints(newTotal);
              setAnimationType(type);
              setTimeout(() => setAnimationType(null), 2500);
            }, 3500);
          } else {
            // No emoji — just do counter animation immediately
            setRainEmoji(type === "gain" ? "💎" : "💨");
            setAnimationType(type);
            setTotalPoints(newTotal);
            setEntries(newEntries);
            prevTotalRef.current = newTotal;
            setTimeout(() => setAnimationType(null), 2500);
          }
        } else {
          prevTotalRef.current = newTotal;
          setTotalPoints(newTotal);
          setEntries(newEntries);
        }
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    } finally {
      setLoading(false);
    }
  }, [kidId]);

  useEffect(() => {
    fetchPoints();
  }, [kidId]);

  // Animate the counter
  useEffect(() => {
    if (loading) return;
    const start = displayedPoints;
    const end = totalPoints;
    if (start === end) return;

    const diff = end - start;
    const steps = Math.min(Math.abs(diff), 30);
    const stepDuration = 600 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayedPoints(Math.round(start + diff * progress));
      if (step >= steps) clearInterval(interval);
    }, stepDuration);

    return () => clearInterval(interval);
  }, [totalPoints, loading]);

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchPoints, 15000);
    return () => clearInterval(interval);
  }, [fetchPoints]);

  const recentActivity = entries.slice(0, 5);

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  return (
    <PointsCelebrationWrapper kidId={kidId} currentPoints={totalPoints}>
      {({ onReplay, canReplay }) => (
    <div>
      <style jsx>{`
        @keyframes spin-slow {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes gem-rain-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(360deg); opacity: 0; }
        }
        @keyframes gem-fade-out {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 0.5; }
          100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.3); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.6); }
        }
        @keyframes counter-bump {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes slide-in {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        :global(.animate-spin-slow) {
          animation: spin-slow 2s linear infinite;
          transform-style: preserve-3d;
        }
        :global(.gem-rain) {
          animation: gem-rain-fall 2s ease-in forwards;
        }
        :global(.gem-fade) {
          animation: gem-fade-out 1.5s ease-out forwards;
        }
        :global(.pulse-glow) {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        :global(.counter-bump) {
          animation: counter-bump 0.4s ease-out;
        }
        :global(.slide-in) {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>

      {/* Gem Counter Hero */}
      <div className="mb-8 relative overflow-hidden">
        <div className={`bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl shadow-xl p-8 text-white relative ${animationType ? "pulse-glow" : ""}`}>
          {/* Phase 1: Big activity emoji on dark backdrop */}
          {showEmoji && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-3xl" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="text-[120px] sm:text-[150px] animate-bounce drop-shadow-2xl">
                {rainEmoji}
              </div>
            </div>
          )}

          {/* Phase 2: Counter bump glow */}
          {animationType && !showEmoji && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <RainParticle key={i} index={i} type={animationType} emoji={rainEmoji} />
              ))}
            </div>
          )}

          <div className="relative z-10">
            {/* 3-column layout: lifetime | points | date/week */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Lifetime Earned */}
              <div className="flex-1 text-left hidden sm:block">
                {totalEarned > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 inline-block">
                    <p className="text-xs text-white/60 mb-0.5">🏆 {t("lifetimeLabel")}</p>
                    <p className="text-2xl font-bold font-mono">{totalEarned}</p>
                    <p className="text-xs text-white/50">{t("pts")}</p>
                  </div>
                )}
              </div>

              {/* Center: Gem + Points Counter */}
              <div className="text-center flex-shrink-0">
                {/* Gem icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-1">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 animate-spin-slow">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg" />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-700" />
                    <div className="absolute top-2 left-3 w-4 h-6 bg-yellow-200 rounded-full opacity-60 blur-[1px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-yellow-900 font-bold text-2xl opacity-70">&#x2605;</span>
                    </div>
                  </div>
                </div>

                {/* Points counter */}
                <div className={`text-7xl sm:text-8xl font-black font-mono tracking-tight ${animationType ? "counter-bump" : ""}`}>
                  {displayedPoints}
                </div>
                <p className="text-lg font-medium text-white/80 mt-1">
                  {t("myPoints")}
                </p>
                <p className="text-sm mt-1 text-white/60">
                  {t("keepUpGreatWork")}
                </p>
              </div>

              {/* Right: Today's Date + Week Range */}
              <div className="flex-1 text-right hidden sm:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 inline-block">
                  <p className="text-xs text-white/60 mb-0.5">📅 {t("todayLabel")}</p>
                  <p className="text-sm font-semibold">{todayFormatted}</p>
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/60 mb-0.5">🌟 {t("weekRangeLabel")}</p>
                    <p className="text-sm font-semibold">{weekRangeFormatted}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: show lifetime + date in a row below the counter */}
            <div className="flex items-center justify-center gap-3 mt-3 sm:hidden text-xs">
              {totalEarned > 0 && (
                <span className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                  🏆 {totalEarned} {t("pts")}
                </span>
              )}
              <span className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                📅 {weekRangeFormatted}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-5">
              <Link
                href={readOnly ? "/view-as/points/history" : "/points/history"}
                className="px-5 py-2.5 bg-white/15 hover:bg-white/25 rounded-full text-sm font-medium transition-colors backdrop-blur-sm"
              >
                {t("viewHistory")}
              </Link>
              <Link
                href={readOnly ? "/view-as/redeem" : "/redeem"}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-full text-sm font-medium transition-colors shadow-lg"
              >
                {t("redeemRewards")}
              </Link>
              {canReplay && (
                <button
                  onClick={onReplay}
                  className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 rounded-full text-sm font-medium transition-colors"
                >
                  &#x1F389;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {t("recentActivity")}
          </h2>
          <div className="bg-white rounded-2xl shadow-lg divide-y divide-gray-50 overflow-hidden">
            {recentActivity.map((entry, i) => {
              const isPositive = entry.points > 0;
              const description = entry.note || entry.chore?.title || (isPositive ? t("earnedPoints") : t("spentPoints"));
              const timeAgo = getTimeAgo(entry.date);

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 slide-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    isPositive
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-500"
                  }`}>
                    {isPositive ? "+" : "-"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {description}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo}</p>
                  </div>
                  <div className={`text-sm font-bold ${
                    isPositive ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {isPositive ? "+" : ""}{entry.points} {tCommon("pts")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar and Badges Side by Side */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {t("myCalendar")}
          </h2>
          <PointsCalendar entries={entries} className="flex-1" />
        </div>

        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {tBadges("myBadges")}
          </h2>
          <div className="bg-white rounded-2xl shadow-lg p-4 flex-1">
            <BadgeShowcase kidId={kidId} />
          </div>
        </div>
      </div>

      {/* Chore Flashcards Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t("choresYouCanDo")}
        </h2>
        <ChoreFlashcards />
      </div>
    </div>
      )}
    </PointsCelebrationWrapper>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
