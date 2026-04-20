"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";

type PointEntry = {
  id: string;
  points: number;
  date: string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function KidCalendar() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchPoints();
  }, [session?.user?.id]);

  const fetchPoints = async () => {
    try {
      const res = await fetch(`/api/points?kidId=${session?.user?.id}`);
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch points:", err);
    } finally {
      setLoading(false);
    }
  };

  const dayTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      const dateStr = entry.date.slice(0, 10);
      map[dateStr] = (map[dateStr] || 0) + entry.points;
    }
    return map;
  }, [entries]);

  const monthData = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const cells: Array<{ day: number; inMonth: boolean; dateStr: string }> = [];

    // Previous month padding
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      cells.push({
        day: d,
        inMonth: false,
        dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        inMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Next month padding to fill 42 cells
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      cells.push({
        day: d,
        inMonth: false,
        dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    return cells;
  }, [year, month]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const fireDays = useMemo(() => {
    return monthData.filter((c) => c.inMonth && (dayTotals[c.dateStr] || 0) >= 10).length;
  }, [monthData, dayTotals]);

  const activeDays = useMemo(() => {
    return monthData.filter((c) => c.inMonth && (dayTotals[c.dateStr] || 0) > 0).length;
  }, [monthData, dayTotals]);

  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayPoints = dayTotals[todayStr] || 0;

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
          <p className="text-xs uppercase tracking-wider opacity-80">My calendar</p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-2xl font-black font-[family-name:var(--font-baloo-2)]">
              {monthName}
            </h1>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="bg-white/15 rounded-xl px-3 py-1.5 text-sm font-bold">
              Fire days {"\uD83D\uDD25"} {fireDays}
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-1.5 text-sm font-bold">
              Active days {"\uD83D\uDC8E"} {activeDays}
            </div>
          </div>
        </div>
      </KidHeaderBG>

      <div className="px-4 mt-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-ca-muted mb-3">
          <span>{"\uD83D\uDD25"} &gt;10 pts</span>
          <span>{"\uD83D\uDC8E"} 1+ pts</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ca-cobalt inline-block" /> Today
          </span>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-ca-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {monthData.map((cell, i) => {
              const pts = dayTotals[cell.dateStr] || 0;
              const isFire = pts >= 10;
              const isGem = pts > 0 && pts < 10;
              const isToday = cell.dateStr === todayStr;

              let bgColor = "#f7f3e6";
              if (!cell.inMonth) bgColor = "transparent";
              else if (isFire) bgColor = "#ffe4d4";
              else if (isGem) bgColor = "#d7eaf8";

              return (
                <div
                  key={i}
                  className="aspect-square rounded-[10px] flex flex-col items-center justify-center relative"
                  style={{
                    backgroundColor: bgColor,
                    border: isToday && cell.inMonth ? "2px solid var(--ca-cobalt)" : "none",
                  }}
                >
                  {cell.inMonth && (
                    <>
                      <span className="text-[13px] font-extrabold text-ca-ink leading-none">
                        {cell.day}
                      </span>
                      {isFire && <span className="text-[10px] leading-none">{"\uD83D\uDD25"}</span>}
                      {isGem && <span className="text-[10px] leading-none">{"\uD83D\uDC8E"}</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today summary card */}
        <div className="bg-white rounded-[18px] p-4 mt-4 shadow-sm">
          <h3 className="text-sm font-bold text-ca-ink mb-1">Today</h3>
          <p className="text-ca-muted text-sm">
            {todayPoints > 0
              ? `You earned ${todayPoints} point${todayPoints !== 1 ? "s" : ""} today! ${todayPoints >= 10 ? "\uD83D\uDD25" : "\uD83D\uDC8E"}`
              : "No points yet today. Complete a chore to get started!"}
          </p>
        </div>
      </div>

      <KidTabBar />
    </div>
  );
}
