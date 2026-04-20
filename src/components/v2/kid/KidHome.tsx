"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import CoinCounter from "@/components/v2/CoinCounter";
import CoinSmall from "@/components/v2/CoinSmall";
import BadgeShowcase from "@/components/badges/BadgeShowcase";
import PointsCelebrationWrapper from "@/components/points/PointsCelebrationWrapper";

// ------- Types -------

interface PointEntry {
  id: string;
  points: number;
  date: string;
  chore?: { title: string } | null;
}

interface PointsResponse {
  totalPoints: number;
  entries: PointEntry[];
}

interface KidHomeProps {
  kidId: string;
  kidName: string;
}

// ------- Helpers -------

// ------- Month calendar helpers -------

function buildMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number; inMonth: boolean; dateStr: string }> = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  while (cells.length < 42) {
    const d = cells.length - firstDay - daysInMonth + 1;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  // Trim last row if entirely next month
  if (cells.slice(35).every((c) => !c.inMonth)) return cells.slice(0, 35);
  return cells;
}

// ------- Tile colors for chore cards -------

const tileColors = ["tile-teal", "tile-peach", "tile-pink", "tile-mint"] as const;
const tileColorMap: Record<string, string> = {
  "tile-teal": "#b2f5ea",
  "tile-peach": "#fed7aa",
  "tile-pink": "#fbcfe8",
  "tile-mint": "#a7f3d0",
};

// ------- Swipeable Chore Card -------

function SwipeableChoreCard({
  entry,
  bg,
}: {
  entry: PointEntry;
  bg: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    isDraggingRef.current = true;
    if (cardRef.current) {
      cardRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    // Only allow rightward drag
    const clampedDx = Math.max(0, Math.min(dx, 80));
    currentXRef.current = clampedDx;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${clampedDx}px)`;
      cardRef.current.style.opacity = `${1 - clampedDx * 0.003}`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease";
      cardRef.current.style.transform = "translateX(0px)";
      cardRef.current.style.opacity = "1";
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 touch-pan-y"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)", willChange: "transform" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Tile icon */}
      <div
        className="flex items-center justify-center rounded-xl"
        style={{ width: 40, height: 40, background: bg }}
      >
        <span className="text-lg">✨</span>
      </div>
      {/* Chore title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ca-ink truncate">
          {entry.chore!.title}
        </p>
      </div>
      {/* Points */}
      <div className="flex items-center gap-1">
        <CoinSmall size={16} />
        <span className="text-sm font-bold text-ca-gold-deep">
          +{entry.points}
        </span>
      </div>
      {/* Check */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 24, height: 24, background: "#22c55e" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 7L6 10L11 4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// ------- Component -------

export default function KidHome({ kidId, kidName }: KidHomeProps) {
  const [data, setData] = useState<PointsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  useEffect(() => {
    fetch(`/api/points?kidId=${kidId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [kidId]);

  // Day totals for calendar
  const dayTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of data?.entries || []) {
      const ds = new Date(e.date).toISOString().split("T")[0];
      if (e.points > 0) map[ds] = (map[ds] || 0) + e.points;
    }
    return map;
  }, [data?.entries]);

  const monthCells = useMemo(() => buildMonthCells(calYear, calMonth), [calYear, calMonth]);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthName = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ca-cream flex items-center justify-center font-[family-name:var(--font-baloo-2)]">
        <p className="text-lg text-ca-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ca-cream flex items-center justify-center font-[family-name:var(--font-baloo-2)]">
        <p className="text-lg text-red-500">Failed to load data</p>
      </div>
    );
  }

  const todayEntries = data.entries.filter((e) => {
    const entryDate = new Date(e.date).toISOString().split("T")[0];
    return entryDate === todayStr && e.points > 0;
  });
  const todayDelta = todayEntries.reduce((sum, e) => sum + e.points, 0);
  const previousPoints = data.totalPoints - todayDelta;

  const todayChores = todayEntries.filter((e) => e.chore?.title);

  return (
    <PointsCelebrationWrapper kidId={kidId} currentPoints={data.totalPoints}>
      {({ onReplay, canReplay }) => (
    <div className="min-h-screen bg-ca-cream pb-[110px] font-[family-name:var(--font-baloo-2)]">
      {/* Header */}
      <KidHeaderBG>
        {/* Greeting row */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">
              Hey {kidName} 👋
            </p>
            <p className="text-xl font-extrabold">
              Let&apos;s earn some gems!
            </p>
          </div>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.4)",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {kidName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Coin Counter */}
        <div className="flex justify-center my-4">
          <CoinCounter base={previousPoints} delta={todayDelta} size="hero" />
        </div>

      </KidHeaderBG>

      {/* Today's Chores */}
      {todayChores.length > 0 && (
        <section className="px-4 mt-6">
          <h2 className="text-lg font-bold text-ca-ink mb-3">Today&apos;s chores ✅</h2>
          <div className="flex flex-col gap-3">
            {todayChores.map((entry, idx) => {
              const color = tileColors[idx % tileColors.length];
              const bg = tileColorMap[color];
              return (
                <SwipeableChoreCard
                  key={entry.id}
                  entry={entry}
                  bg={bg}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Calendar + Badges side by side */}
      <section className="px-4 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
        {/* Month Calendar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-ca-ink">My calendar</h2>
            {canReplay && (
              <button onClick={onReplay} className="text-xl" title="Replay celebration">
                🎉
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[rgba(26,24,19,0.08)]">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="w-9 h-9 rounded-full hover:bg-ca-cream flex items-center justify-center">
                <ChevronLeft size={20} className="text-ca-ink" />
              </button>
              <span className="text-base font-extrabold text-ca-ink font-[family-name:var(--font-baloo-2)]">{monthName}</span>
              <button onClick={nextMonth} className="w-9 h-9 rounded-full hover:bg-ca-cream flex items-center justify-center">
                <ChevronRight size={20} className="text-ca-ink" />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-xs font-bold text-ca-muted py-1">{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthCells.map((cell, i) => {
                const pts = dayTotals[cell.dateStr] || 0;
                const isFire = pts >= 10;
                const isGem = pts > 0 && pts < 10;
                const isToday = cell.dateStr === todayStr && cell.inMonth;

                let bg = "#f7f3e6";
                if (!cell.inMonth) bg = "transparent";
                else if (isFire) bg = "#ffe4d4";
                else if (isGem) bg = "#d7eaf8";

                return (
                  <div
                    key={i}
                    className="rounded-xl flex flex-col items-center justify-center py-2"
                    style={{
                      backgroundColor: bg,
                      border: isToday ? "2.5px solid var(--ca-cobalt)" : "1px solid transparent",
                      opacity: cell.inMonth ? 1 : 0.25,
                      minHeight: 48,
                    }}
                  >
                    {cell.inMonth && (
                      <>
                        <span className="text-sm font-extrabold text-ca-ink leading-none">{cell.day}</span>
                        <span className="text-base leading-none mt-0.5">
                          {isFire ? "🔥" : isGem ? "💎" : ""}
                        </span>
                        {(isFire || isGem) && (
                          <span className="text-[10px] font-bold text-ca-muted leading-none mt-0.5">
                            {pts}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs font-bold text-ca-muted">
              <span>🔥 10+ gems</span>
              <span>💎 1+ gems</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-ca-cobalt inline-block" />
                Today
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-ca-ink">My badges 🏆</h2>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[rgba(26,24,19,0.08)]">
            <BadgeShowcase kidId={kidId} />
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <KidTabBar />
    </div>
      )}
    </PointsCelebrationWrapper>
  );
}
