"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CalendarEventForm from "@/components/calendar/CalendarEventForm";

// ------- Types -------

interface Kid {
  id: string;
  name: string | null;
  email: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

interface CalendarSettings {
  isConnected: boolean;
  selectedCalendarName: string | null;
}

interface DayCell {
  date: Date;
  dayNum: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

// ------- Paper Garden member colors -------

const KID_COLORS: Record<number, { bg: string; border: string; text: string; dot: string }> = {
  0: { bg: "rgba(180,158,240,0.15)", border: "#b49ef0", text: "#7b6bad", dot: "#b49ef0" },
  1: { bg: "rgba(155,191,122,0.15)", border: "#9bbf7a", text: "#4a6a32", dot: "#9bbf7a" },
  2: { bg: "rgba(216,139,139,0.15)", border: "#d88b8b", text: "#a05555", dot: "#d88b8b" },
  3: { bg: "rgba(127,168,221,0.15)", border: "#7fa8dd", text: "#4a6a8a", dot: "#7fa8dd" },
};

// ------- Helpers -------

function getMonthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Match event to a family member by checking if any known name appears in the summary
function getEventColorIdx(summary: string, familyNames: string[]): number {
  const lower = summary.toLowerCase();
  for (let i = 0; i < familyNames.length; i++) {
    if (lower.includes(familyNames[i].toLowerCase())) return i % 4;
  }
  return 3; // default: sky blue
}

// ------- Component -------

export default function ParentCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [kids, setKids] = useState<Kid[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);

  const monthStart = getMonthStart(viewYear, viewMonth);
  const monthName = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Load kids + points
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const kidsRes = await fetch("/api/family/kids");
        const kidsData = await kidsRes.json();
        if (!kidsRes.ok || !Array.isArray(kidsData.kids)) return;
        setKids(kidsData.kids);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load Google Calendar settings + events
  const loadCalendarEvents = useCallback(async () => {
    try {
      const settingsRes = await fetch("/api/calendar/settings");
      const settingsData = await settingsRes.json();
      setCalendarSettings(settingsData.settings);

      if (settingsData.settings?.isConnected) {
        const start = new Date(viewYear, viewMonth, 1);
        const end = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
        const res = await fetch(
          `/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setCalendarEvents(data.events || []);
        }
      }
    } catch {
      // Calendar not connected, that's fine
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  // Family members for legend + color matching: kids + parents
  // Kids come from API, parents are the logged-in user + partner
  const familyNames: string[] = [
    ...kids.map((k) => (k.name || k.email).split(" ")[0]),
    "Mingfei",
    "Yue",
  ];

  // Build month grid (6 weeks × 7 days = 42 cells)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: DayCell[] = [];

  // Previous month fill
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const date = new Date(viewYear, viewMonth - 1, prevMonthDays - i);
    cells.push({ date, dayNum: date.getDate(), isToday: false, isCurrentMonth: false, events: [] });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const dateStr = toLocalDateString(date);
    const dayEvents = calendarEvents.filter((ev) => {
      const startStr = ev.start.date || (ev.start.dateTime ? toLocalDateString(new Date(ev.start.dateTime)) : undefined);
      if (!startStr) return false;
      let endStr = ev.end.date || (ev.end.dateTime ? toLocalDateString(new Date(ev.end.dateTime)) : startStr);
      if (ev.start.date && ev.end.date && endStr) {
        const endDate = new Date(endStr + "T00:00:00");
        endDate.setDate(endDate.getDate() - 1);
        endStr = toLocalDateString(endDate);
      }
      return dateStr >= startStr && dateStr <= endStr;
    });

    cells.push({
      date,
      dayNum: d,
      isToday: isSameDay(date, today),
      isCurrentMonth: true,
      events: dayEvents,
    });
  }

  // Next month fill
  while (cells.length < 42) {
    const date = new Date(viewYear, viewMonth + 1, cells.length - firstDayOfMonth - daysInMonth + 1);
    cells.push({ date, dayNum: date.getDate(), isToday: false, isCurrentMonth: false, events: [] });
  }

  // If last row is entirely next month, trim to 35
  const lastRowStart = 35;
  const allNextMonth = cells.slice(lastRowStart).every((c) => !c.isCurrentMonth);
  const displayCells = allNextMonth ? cells.slice(0, 35) : cells;

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="px-7 pt-7 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-pg-ink">
            {monthName}
          </h1>
          <p className="mt-0.5 text-sm text-pg-muted">Family calendar</p>
        </div>
        <button
          onClick={() => setShowEventForm(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
        >
          <Plus size={16} />
          Add event
        </button>
      </div>

      {/* Month nav */}
      <div className="mt-3 flex items-center justify-between px-7">
        <button onClick={goToPrevMonth} className="rounded-lg p-2 hover:bg-[rgba(68,55,32,0.06)]">
          <ChevronLeft size={20} className="text-pg-ink" />
        </button>
        <button
          onClick={goToToday}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#4a6a32] hover:bg-[rgba(107,142,78,0.08)]"
        >
          Today
        </button>
        <button onClick={goToNextMonth} className="rounded-lg p-2 hover:bg-[rgba(68,55,32,0.06)]">
          <ChevronRight size={20} className="text-pg-ink" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="mt-4 px-4">
        {loading ? (
          <div className="py-12 text-center text-pg-muted">Loading...</div>
        ) : (
          <div className="rounded-[14px] border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[rgba(68,55,32,0.14)] bg-[#F9F4E8]">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#857d68]">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {displayCells.map((cell, i) => {
                const hasContent = cell.events.length > 0;
                return (
                  <div
                    key={i}
                    onClick={() => hasContent ? setSelectedDay(cell) : undefined}
                    className={`min-h-[90px] border-b border-r border-[rgba(68,55,32,0.06)] p-1.5 ${
                      cell.isToday ? "bg-[rgba(107,142,78,0.06)]" : ""
                    } ${!cell.isCurrentMonth ? "opacity-40" : ""} ${
                      hasContent ? "cursor-pointer hover:bg-[rgba(68,55,32,0.03)]" : ""
                    }`}
                  >
                    {/* Day number */}
                    <div className="mb-1">
                      <span
                        className={`inline-flex text-xs font-semibold ${
                          cell.isToday
                            ? "h-6 w-6 items-center justify-center rounded-full bg-[#4a6a32] text-white"
                            : "text-[#2f2a1f]"
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                    </div>

                    {/* Google Calendar events */}
                    {cell.events.slice(0, 2).map((ev) => {
                      const colorIdx = getEventColorIdx(ev.summary, familyNames);
                      const colors = KID_COLORS[colorIdx] || KID_COLORS[0];
                      return (
                        <div
                          key={ev.id}
                          className="mb-0.5 truncate rounded-sm border-l-2 px-1 py-px text-[9px] leading-tight font-medium"
                          style={{
                            backgroundColor: colors.bg,
                            borderLeftColor: colors.border,
                            color: colors.text,
                          }}
                        >
                          {ev.summary}
                        </div>
                      );
                    })}

                    {/* Overflow count */}
                    {cell.events.length > 2 && (
                      <p className="text-[9px] text-[#857d68] text-center mt-0.5">
                        +{cell.events.length - 2} more
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Family member color legend */}
      {familyNames.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 px-7">
          {familyNames.map((name, i) => {
            const colors = KID_COLORS[i % 4];
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors.dot }}
                />
                <span className="text-xs text-[#857d68]">{name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Day detail modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-md rounded-[14px] border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[rgba(68,55,32,0.14)] bg-[#F9F4E8] px-5 py-3 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-[#2f2a1f]">
                {selectedDay.date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[#857d68] hover:text-[#2f2a1f] transition"
              >
                &times;
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {selectedDay.events.map((ev) => {
                const colorIdx = getEventColorIdx(ev.summary, familyNames);
                const colors = KID_COLORS[colorIdx] || KID_COLORS[0];
                const time = ev.start.dateTime
                  ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "All day";
                return (
                  <div
                    key={ev.id}
                    className="rounded-lg border-l-3 px-3 py-2"
                    style={{ backgroundColor: colors.bg, borderLeftColor: colors.border, borderLeftWidth: 3 }}
                  >
                    <p className="text-sm font-medium" style={{ color: colors.text }}>{ev.summary}</p>
                    <p className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.7 }}>{time}</p>
                  </div>
                );
              })}
              {selectedDay.events.length === 0 && (
                <p className="text-sm text-[#857d68] text-center py-4">No events this day</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add event form */}
      {showEventForm && calendarSettings?.isConnected && (
        <CalendarEventForm
          event={null}
          selectedDate={new Date()}
          onClose={() => setShowEventForm(false)}
          onSave={() => {
            setShowEventForm(false);
            loadCalendarEvents();
          }}
        />
      )}

      <ParentTabBar />
    </div>
  );
}
