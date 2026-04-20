"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import CoinCounter from "@/components/v2/CoinCounter";
import CoinSmall from "@/components/v2/CoinSmall";
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

interface DayData {
  day: string;
  total: number;
  type: "fire" | "gem" | "none";
  isToday: boolean;
  dateStr: string;
}

interface KidHomeProps {
  kidId: string;
  kidName: string;
}

// ------- Helpers -------

function getWeekData(entries: PointEntry[]): DayData[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: DayData[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const dayEntries = entries.filter((e) => {
      const entryDate = new Date(e.date).toISOString().split("T")[0];
      return entryDate === dateStr && e.points > 0;
    });

    const total = dayEntries.reduce((sum, e) => sum + e.points, 0);
    const isToday = i === dayOfWeek;

    let type: "fire" | "gem" | "none" = "none";
    if (total >= 10) type = "fire";
    else if (total > 0) type = "gem";

    result.push({ day: days[i], total, type, isToday, dateStr });
  }

  return result;
}

function getStreakText(weekData: DayData[]): string {
  // Count consecutive days with points > 0 from end (up to today)
  const todayIdx = weekData.findIndex((d) => d.isToday);
  let streak = 0;
  for (let i = todayIdx; i >= 0; i--) {
    if (weekData[i].total > 0) {
      streak++;
    } else {
      break;
    }
  }
  if (streak === 0) return "Start your streak!";
  if (streak === 1) return "1 day streak";
  return `${streak} day streak`;
}

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

  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntries = data.entries.filter((e) => {
    const entryDate = new Date(e.date).toISOString().split("T")[0];
    return entryDate === todayStr && e.points > 0;
  });
  const todayDelta = todayEntries.reduce((sum, e) => sum + e.points, 0);
  const previousPoints = data.totalPoints - todayDelta;

  const weekData = getWeekData(data.entries);
  const streakText = getStreakText(weekData);

  const todayChores = todayEntries.filter((e) => e.chore?.title);

  const dayBgMap: Record<string, string> = {
    fire: "#ffe4d4",
    gem: "#d7eaf8",
    none: "#f0ede2",
  };

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

        {/* Pill buttons */}
        <div className="flex justify-center gap-3 mt-2">
          <Link
            href="/points/history"
            className="px-5 py-2 rounded-full text-sm font-bold text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            History
          </Link>
          <Link
            href="/shop"
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{ background: "var(--ca-gold)", color: "var(--ca-gold-deep)" }}
          >
            Redeem
          </Link>
        </div>
      </KidHeaderBG>

      {/* Week Strip */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ca-ink">This week 🔥</h2>
          <span className="text-sm font-semibold text-ca-muted">{streakText}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekData.map((d) => (
            <div
              key={d.dateStr}
              className="flex flex-col items-center rounded-xl py-2 px-1"
              style={{
                background: dayBgMap[d.type],
                border: d.isToday ? "2px solid var(--ca-cobalt)" : "2px solid transparent",
              }}
            >
              <span className="text-[10px] font-bold text-ca-muted uppercase">
                {d.day}
              </span>
              <span className="text-sm font-bold text-ca-ink mt-0.5">
                {d.total > 0 ? d.total : "-"}
              </span>
              <span className="text-sm mt-0.5">
                {d.type === "fire" ? "🔥" : d.type === "gem" ? "💎" : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

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

      {/* Month Calendar */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ca-ink">My calendar</h2>
          {canReplay && (
            <button onClick={onReplay} className="text-xl" title="Replay celebration">
              🎉
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl p-3 border border-[rgba(26,24,19,0.08)]">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-ca-cream flex items-center justify-center">
              <ChevronLeft size={18} className="text-ca-muted" />
            </button>
            <span className="text-sm font-bold text-ca-ink">{monthName}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-ca-cream flex items-center justify-center">
              <ChevronRight size={18} className="text-ca-muted" />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-ca-muted py-0.5">{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
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
                  className="aspect-square rounded-[10px] flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: bg,
                    border: isToday ? "2px solid var(--ca-cobalt)" : "none",
                    opacity: cell.inMonth ? 1 : 0.3,
                  }}
                >
                  {cell.inMonth && (
                    <>
                      <span className="text-[12px] font-extrabold text-ca-ink leading-none">{cell.day}</span>
                      {isFire && <span className="text-[9px] leading-none">🔥</span>}
                      {isGem && <span className="text-[9px] leading-none">💎</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-ca-muted">
            <span>🔥 10+ pts</span>
            <span>💎 1+ pts</span>
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
