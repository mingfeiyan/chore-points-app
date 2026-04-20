"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";

// ------- Types -------

interface Kid {
  id: string;
  name: string | null;
  email: string;
}

interface PointEntry {
  id: string;
  points: number;
  date: string;
  createdAt: string;
  note: string | null;
  chore?: { title: string } | null;
  kidId?: string;
}

interface DayColumn {
  date: Date;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  entries: Array<PointEntry & { kidName: string; kidColor: string }>;
}

// ------- Constants -------

const KID_COLORS = [
  { bg: "bg-purple-100", border: "border-l-purple-400", text: "text-purple-700" },
  { bg: "bg-emerald-100", border: "border-l-emerald-400", text: "text-emerald-700" },
  { bg: "bg-rose-100", border: "border-l-rose-400", text: "text-rose-700" },
  { bg: "bg-sky-100", border: "border-l-sky-400", text: "text-sky-700" },
];

// ------- Helpers -------

function getWeekStart(referenceDate: Date): Date {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} \u2013 ${endDay}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ------- Component -------

export default function ParentCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [kids, setKids] = useState<Kid[]>([]);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const referenceDate = new Date(today);
  referenceDate.setDate(today.getDate() + weekOffset * 7);
  const weekStart = getWeekStart(referenceDate);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const kidsRes = await fetch("/api/family/kids");
        const kidsData = await kidsRes.json();
        if (!kidsRes.ok || !Array.isArray(kidsData.kids)) return;
        setKids(kidsData.kids);

        // Fetch points for all kids
        const allEntries: PointEntry[] = [];
        await Promise.all(
          kidsData.kids.map(async (kid: Kid) => {
            const res = await fetch(`/api/points?kidId=${kid.id}`);
            const data = await res.json();
            if (data.entries) {
              allEntries.push(
                ...data.entries.map((e: PointEntry) => ({
                  ...e,
                  kidId: kid.id,
                }))
              );
            }
          })
        );
        setEntries(allEntries);
      } catch (err) {
        console.error("Failed to load calendar data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Build kid color map
  const kidColorMap: Record<string, (typeof KID_COLORS)[number]> = {};
  kids.forEach((kid, i) => {
    kidColorMap[kid.id] = KID_COLORS[i % KID_COLORS.length];
  });

  // Build 7 day columns
  const days: DayColumn[] = [];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);

    const dayEntries = entries
      .filter((e) => {
        const entryDate = new Date(e.date || e.createdAt);
        return isSameDay(entryDate, date);
      })
      .map((e) => {
        const kid = kids.find((k) => k.id === e.kidId);
        return {
          ...e,
          kidName: kid?.name || kid?.email || "Unknown",
          kidColor: e.kidId || "",
        };
      });

    days.push({
      date,
      dayName: dayNames[i],
      dayNum: date.getDate(),
      isToday: isSameDay(date, today),
      entries: dayEntries,
    });
  }

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="px-7 pt-7">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
          {formatWeekRange(weekStart)}
        </h1>
        <p className="mt-0.5 text-sm text-pg-muted">Family calendar</p>
      </div>

      {/* Week nav */}
      <div className="mt-3 flex items-center justify-between px-7">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-lg p-2 hover:bg-black/5"
        >
          <ChevronLeft size={20} className="text-pg-ink" />
        </button>
        <button
          type="button"
          onClick={() => setWeekOffset(0)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-pg-accent hover:bg-black/5"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded-lg p-2 hover:bg-black/5"
        >
          <ChevronRight size={20} className="text-pg-ink" />
        </button>
      </div>

      {/* 7-day grid */}
      <div className="mt-4 px-4">
        {loading ? (
          <div className="py-8 text-center text-pg-muted">Loading...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Column headers */}
            {days.map((day) => (
              <div key={day.dayName} className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-pg-muted">
                  {day.dayName}
                </p>
                <p
                  className={`mt-0.5 text-sm font-medium ${
                    day.isToday
                      ? "flex h-6 w-6 mx-auto items-center justify-center rounded-full bg-pg-accent text-white"
                      : "text-pg-ink"
                  }`}
                >
                  {day.dayNum}
                </p>
              </div>
            ))}

            {/* Column bodies */}
            {days.map((day) => (
              <div
                key={`body-${day.dayNum}`}
                className="min-h-[120px] mt-2 space-y-1"
              >
                {day.entries.slice(0, 4).map((entry) => {
                  const colors = kidColorMap[entry.kidId || ""] || KID_COLORS[0];
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-sm border-l-2 ${colors.border} ${colors.bg} px-1 py-0.5`}
                    >
                      <p className={`truncate text-[9px] leading-tight ${colors.text}`}>
                        {entry.chore?.title || entry.note || `+${entry.points}`}
                      </p>
                    </div>
                  );
                })}
                {day.entries.length > 4 && (
                  <p className="text-center text-[9px] text-pg-muted">
                    +{day.entries.length - 4} more
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kid color legend */}
      {kids.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3 px-7">
          {kids.map((kid) => {
            const colors = kidColorMap[kid.id] || KID_COLORS[0];
            return (
              <div key={kid.id} className="flex items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${colors.bg} border ${colors.border}`}
                />
                <span className="text-xs text-pg-muted">
                  {kid.name || kid.email}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <ParentTabBar />
    </div>
  );
}
