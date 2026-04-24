"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, PartyPopper, Trophy, X } from "lucide-react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import CoinCounter from "@/components/v2/CoinCounter";
import CoinSmall from "@/components/v2/CoinSmall";
import FlameIcon from "@/components/v2/FlameIcon";
import BadgeShowcase from "@/components/badges/BadgeShowcase";
import PointsCelebrationWrapper from "@/components/points/PointsCelebrationWrapper";
import { toLocalDay, buildMonthCells } from "@/lib/date-utils";

// ------- Types -------

interface PointEntry {
  id: string;
  points: number;
  date: string;
  createdAt?: string;
  note?: string | null;
  chore?: { title: string } | null;
  redemption?: { reward?: { title: string } | null } | null;
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const dayTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of data?.entries || []) {
      const ds = toLocalDay(e.date);
      if (e.points > 0) map[ds] = (map[ds] || 0) + e.points;
    }
    return map;
  }, [data?.entries]);

  const monthCells = useMemo(() => buildMonthCells(calYear, calMonth), [calYear, calMonth]);

  const selectedDayEntries = useMemo(() => {
    if (!selectedDay || !data?.entries) return [];
    return data.entries
      .filter((e) => toLocalDay(e.date) === selectedDay)
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.date).getTime() -
          new Date(a.createdAt || a.date).getTime()
      );
  }, [selectedDay, data?.entries]);
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

  const todayEntries = data.entries.filter(
    (e) => toLocalDay(e.date) === todayStr && e.points > 0
  );
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
        <div className="mb-2">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            Hey {kidName} 👋
          </p>
          <p className="text-xl font-extrabold">
            Let&apos;s earn some gems!
          </p>
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
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-ca-ink">My calendar</h2>
            {canReplay && (
              <button
                onClick={onReplay}
                title="Replay celebration"
                className="rounded-full p-1.5 text-ca-coral hover:bg-[rgba(236,128,120,0.12)] transition-colors"
              >
                <PartyPopper size={18} />
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
                const hasActivity = cell.inMonth && pts > 0;

                let bg = "#f7f3e6";
                if (!cell.inMonth) bg = "transparent";
                else if (isFire) bg = "#ffe4d4";
                else if (isGem) bg = "#d7eaf8";

                const baseClass =
                  "rounded-xl flex flex-col items-center justify-center py-2";
                const baseStyle: React.CSSProperties = {
                  backgroundColor: bg,
                  border: isToday ? "2.5px solid var(--ca-cobalt)" : "1px solid transparent",
                  opacity: cell.inMonth ? 1 : 0.25,
                  minHeight: 48,
                };
                const cellContent = cell.inMonth && (
                  <>
                    <span className="text-sm font-extrabold text-ca-ink leading-none">{cell.day}</span>
                    <span className="leading-none mt-0.5 flex items-center justify-center">
                      {isFire ? <FlameIcon size={16} /> : isGem ? <CoinSmall size={16} /> : null}
                    </span>
                    {(isFire || isGem) && (
                      <span className="text-[10px] font-bold text-ca-muted leading-none mt-0.5">
                        {pts}
                      </span>
                    )}
                  </>
                );

                if (!hasActivity) {
                  return (
                    <div key={i} className={baseClass} style={baseStyle} aria-hidden={!cell.inMonth}>
                      {cellContent}
                    </div>
                  );
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDay(cell.dateStr)}
                    aria-label={`${cell.day}: ${pts} gem${pts === 1 ? "" : "s"} earned — tap for details`}
                    className={`${baseClass} transition-transform hover:scale-[1.04] active:scale-95`}
                    style={baseStyle}
                  >
                    {cellContent}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs font-bold text-ca-muted">
              <span className="flex items-center gap-1"><FlameIcon size={14} /> 10+ gems</span>
              <span className="flex items-center gap-1"><CoinSmall size={14} /> 1+ gems</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-ca-cobalt inline-block" />
                Today
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-ca-ink">My badges</h2>
            <Trophy size={18} className="text-ca-gold-deep" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[rgba(26,24,19,0.08)]">
            <BadgeShowcase kidId={kidId} />
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <KidTabBar />

      {selectedDay && (
        <DayDetailModal
          dateStr={selectedDay}
          entries={selectedDayEntries}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
      )}
    </PointsCelebrationWrapper>
  );
}

function DayDetailModal({
  dateStr,
  entries,
  onClose,
}: {
  dateStr: string;
  entries: PointEntry[];
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const total = entries.reduce((sum, e) => sum + e.points, 0);
  const displayDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Gems earned on ${displayDate}`}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-ca-cream px-5 py-4 flex items-center justify-between border-b border-[rgba(26,24,19,0.08)]">
          <div>
            <h3 className="text-lg font-extrabold text-ca-ink font-[family-name:var(--font-baloo-2)]">
              {displayDate}
            </h3>
            <p className="text-sm font-bold text-ca-muted flex items-center gap-1 mt-0.5">
              <CoinSmall size={14} /> {total} gem{total === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-ca-muted hover:text-ca-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {entries.map((entry) => {
            const isPositive = entry.points > 0;
            const label =
              entry.chore?.title ||
              (entry.redemption?.reward?.title
                ? `Redeemed: ${entry.redemption.reward.title}`
                : isPositive
                ? "Bonus gems"
                : "Gems spent");
            const time = entry.createdAt
              ? new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : null;
            return (
              <div
                key={entry.id}
                className="rounded-xl px-3 py-2.5 flex items-start gap-3"
                style={{
                  backgroundColor: isPositive ? "#d7eaf8" : "#ffe4d4",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ca-ink truncate">{label}</p>
                  {entry.note && (
                    <p className="text-xs text-ca-muted mt-0.5 italic">{entry.note}</p>
                  )}
                  {time && <p className="text-[11px] text-ca-muted mt-0.5">{time}</p>}
                </div>
                <span
                  className="text-sm font-extrabold font-[family-name:var(--font-baloo-2)] whitespace-nowrap"
                  style={{ color: isPositive ? "var(--ca-cobalt-deep)" : "var(--ca-coral)" }}
                >
                  {isPositive ? "+" : ""}
                  {entry.points}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
