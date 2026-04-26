"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronUp, ChevronDown, Settings as SettingsIcon, Check } from "lucide-react";
import FlameIcon from "@/components/v2/FlameIcon";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import WeeklyCalendarView from "@/components/calendar/WeeklyCalendarView";
import PhotoCarousel from "@/components/dashboard/PhotoCarousel";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { toLocalDay } from "@/lib/date-utils";
import { getSundayWeekStart } from "@/lib/week-utils";

// ------- Dashboard module config -------
// Future: add { hidden: string[], widths: Record<id, "half" | "full"> } to
// the saved layout shape so users can choose per-module width too.
const MODULE_LABELS: Record<string, string> = {
  stats: "Kid stats",
  calendar: "Family calendar",
  today: "Today's activity",
  photos: "Photo gallery",
};
// Modules listed here render at half-width on lg+ screens. Others are full.
// Adjacent half-width modules pair side-by-side via flex-wrap; a half next
// to a full simply leaves blank space — the user can reorder to fix that.
const HALF_WIDTH_MODULES: Set<string> = new Set(["today", "photos"]);
const DEFAULT_ORDER = ["stats", "calendar", "today", "photos"];
const LAYOUT_STORAGE_KEY = "dashboardLayout:v1";

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
}

interface KidWithPoints extends Kid {
  totalPoints: number;
  todayDelta: number;
  todayEntries: PointEntry[];
  allEntries: PointEntry[];
  badgesThisWeek: number;
}

interface ParentHomeProps {
  userName: string;
}

// ------- Helpers -------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ------- Component -------

export default function ParentHome({ userName }: ParentHomeProps) {
  const router = useRouter();
  const { setViewingAsKid } = useKidMode();
  const [kids, setKids] = useState<KidWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; icon: string; location: string } | null>(null);
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [editingLayout, setEditingLayout] = useState(false);

  const firstName = userName?.split(" ")[0] || "there";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { order?: string[] };
      if (!Array.isArray(parsed.order)) return;
      // Filter to known module ids, then append any defaults the user
      // hasn't seen yet (so newly-added modules show up automatically).
      const known = new Set(DEFAULT_ORDER);
      const filtered = parsed.order.filter((id) => known.has(id));
      const missing = DEFAULT_ORDER.filter((id) => !filtered.includes(id));
      setOrder([...filtered, ...missing]);
    } catch {
      // ignore — fall back to default order
    }
  }, []);

  const saveOrder = (next: string[]) => {
    setOrder(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ order: next, version: 1 }));
    } catch {
      // ignore — order still persists for the current page view
    }
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    saveOrder(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= order.length - 1) return;
    const next = [...order];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    saveOrder(next);
  };

  const fetchData = async () => {
    try {
      const kidsRes = await fetch("/api/family/kids");
      const kidsData = await kidsRes.json();
      if (!kidsRes.ok || !Array.isArray(kidsData.kids)) return;

      // Compute the start of this week (Sunday) once for badge counting.
      const weekStart = getSundayWeekStart(new Date());

      const enriched: KidWithPoints[] = await Promise.all(
        kidsData.kids.map(async (kid: Kid) => {
          const [pointsRes, badgesRes] = await Promise.all([
            fetch(`/api/points?kidId=${kid.id}`),
            fetch(`/api/badges?kidId=${kid.id}`),
          ]);
          const pointsData = await pointsRes.json();
          const entries: PointEntry[] = pointsData.entries || [];

          const todayEntries = entries.filter((e) => isToday(e.createdAt || e.date));
          const todayDelta = todayEntries.reduce((s, e) => s + e.points, 0);

          // achievementBadges from /api/badges already includes built-in
          // achievements AND custom AI-generated chore badges (which are
          // stored as AchievementBadge rows with the custom-award- prefix).
          let badgesThisWeek = 0;
          if (badgesRes.ok) {
            const badgesData = await badgesRes.json();
            const earned: { earnedAt?: string }[] = badgesData.achievementBadges || [];
            badgesThisWeek = earned.filter(
              (b) => b.earnedAt && new Date(b.earnedAt) >= weekStart
            ).length;
          }

          return {
            ...kid,
            totalPoints: pointsData.totalPoints || 0,
            todayDelta,
            todayEntries,
            allEntries: entries,
            badgesThisWeek,
          };
        })
      );

      setKids(enriched);
    } catch (err) {
      console.error("Failed to fetch parent home data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      if (!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const [wRes, gRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`),
          ]);
          const wData = await wRes.json();
          const gData = await gRes.json();
          if (wData.current) {
            const code = wData.current.weather_code;
            const icons: Record<number, string> = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 51: "🌧️", 61: "🌧️", 71: "🌨️", 80: "🌦️", 95: "⛈️" };
            const icon = icons[code] || "🌡️";
            const location = gData.address?.city || gData.address?.town || gData.address?.county || "";
            setWeather({ temp: Math.round(wData.current.temperature_2m), icon, location });
          }
        },
        () => {} // silently fail if location denied
      );
    } catch { /* ignore */ }
  };

  const allTodayEntries = kids
    .flatMap((k) =>
      k.todayEntries.map((e) => ({
        ...e,
        kidName: k.name || k.email,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const handleViewAsKid = (kid: KidWithPoints) => {
    setViewingAsKid({ id: kid.id, name: kid.name, email: kid.email });
    router.push("/view-as/points");
  };

  const primaryKid = kids[0];
  const isMultiKid = kids.length > 1;

  const weekStart = getSundayWeekStart(new Date());

  function computeKidStats(kid: KidWithPoints): { weekTotal: number; streak: number } {
    const weekTotal = kid.allEntries
      .filter((e) => {
        const d = new Date(e.date || e.createdAt);
        return d >= weekStart && e.points > 0;
      })
      .reduce((s, e) => s + e.points, 0);

    const dayTotals: Record<string, number> = {};
    for (const e of kid.allEntries) {
      if (e.points > 0) {
        const ds = toLocalDay(new Date(e.date || e.createdAt));
        dayTotals[ds] = (dayTotals[ds] || 0) + e.points;
      }
    }
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const ds = toLocalDay(d);
      if (dayTotals[ds]) streak++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return { weekTotal, streak };
  }

  const primaryStats = primaryKid ? computeKidStats(primaryKid) : { weekTotal: 0, streak: 0 };
  const allKidStats = kids.map((k) => ({ kid: k, ...computeKidStats(k) }));

  const renderStats = () => {
    if (!primaryKid) return null;
    if (isMultiKid) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allKidStats.map(({ kid, weekTotal, streak }) => (
            <div
              key={kid.id}
              className="bg-white rounded-xl p-4 border border-[rgba(68,55,32,0.14)]"
              style={{ borderLeft: "3px solid #FFCB3B" }}
            >
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-pg-ink">
                  {kid.name || "Kid"}
                </h3>
                <div className="flex items-baseline gap-1">
                  <CoinSmall size={16} />
                  <span className="font-[family-name:var(--font-fraunces)] text-[24px] font-medium text-pg-ink leading-none tracking-tight">
                    {kid.totalPoints.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-pg-muted uppercase tracking-wide">This week</div>
                  <div className="text-base font-semibold text-pg-accent-deep mt-0.5">+{weekTotal}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-pg-muted uppercase tracking-wide">Streak</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <FlameIcon size={14} />
                    <span className="text-base font-semibold text-[#c5543d]">{streak}</span>
                    <span className="text-xs text-pg-muted">{streak === 1 ? "day" : "days"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: primaryKid.name || "Kid", value: primaryKid.totalPoints.toLocaleString(), sub: "total gems", tone: "#FFCB3B", showCoin: true },
          { label: "This week", value: `+${primaryStats.weekTotal}`, sub: "gems earned", tone: "#6b8e4e", showCoin: false },
          { label: "Streak", value: String(primaryStats.streak), sub: "days in a row", tone: "#c5543d", showCoin: false, showFlame: true },
          { label: "Badges", value: String(primaryKid.badgesThisWeek), sub: "earned this week", tone: "#d88b8b", showCoin: false },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-[rgba(68,55,32,0.14)]"
            style={{ borderLeft: `3px solid ${s.tone}` }}
          >
            <div className="text-[11px] font-semibold text-pg-muted uppercase tracking-wide">{s.label}</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              {s.showCoin && <CoinSmall size={20} />}
              {"showFlame" in s && s.showFlame && <FlameIcon size={20} />}
              <span className="font-[family-name:var(--font-fraunces)] text-[30px] font-medium text-pg-ink leading-none tracking-tight">
                {s.value}
              </span>
            </div>
            <div className="text-xs text-pg-muted mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderToday = () => (
    <div>
      <div className="rounded-[14px] border border-[rgba(68,55,32,0.14)] bg-white p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-pg-ink">
            {isMultiKid ? "Today's activity" : `${primaryKid?.name || "Today"}`}
          </h3>
        </div>
        {allTodayEntries.length === 0 ? (
          <p className="text-sm text-pg-muted py-2">No activity yet today.</p>
        ) : (
          allTodayEntries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 py-2 ${
                i < allTodayEntries.length - 1 ? "border-b border-[rgba(68,55,32,0.08)]" : ""
              }`}
            >
              <span className="w-14 shrink-0 text-[11px] text-pg-muted tabular-nums">
                {formatTime(entry.createdAt)}
              </span>
              <span className="flex-1 text-sm font-medium text-pg-ink truncate">
                {isMultiKid && (
                  <span className="inline-block px-1.5 py-0.5 mr-2 text-[10px] font-bold uppercase tracking-wide rounded bg-[rgba(107,142,78,0.12)] text-pg-accent-deep">
                    {entry.kidName}
                  </span>
                )}
                {entry.chore?.title || entry.note || "Points"}
              </span>
              <div className="flex items-center gap-1 text-sm font-bold text-pg-accent-deep whitespace-nowrap">
                <CoinSmall size={13} />{entry.points > 0 ? "+" : ""}{entry.points}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderModule = (id: string) => {
    switch (id) {
      case "stats":
        return renderStats();
      case "calendar":
        return <WeeklyCalendarView />;
      case "today":
        return renderToday();
      case "photos":
        return <PhotoCarousel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="relative px-7 pt-8">
        {/* Date + weather */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          {formatDate(new Date())}
          {weather && (
            <span>
              {weather.location && ` · ${weather.location}`} · {weather.icon} {weather.temp}°F
            </span>
          )}
        </p>

        {/* Greeting — single line */}
        <h1 className="mt-1.5 font-[family-name:var(--font-fraunces)] text-2xl md:text-[38px] font-medium text-pg-ink leading-tight tracking-tight whitespace-nowrap">
          {getGreeting()}, <em className="italic text-pg-accent-deep">{firstName}</em>
        </h1>

        {/* View as Kid — one button per kid */}
        {kids.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {kids.map((kid) => (
              <button
                key={kid.id}
                onClick={() => handleViewAsKid(kid)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-white"
                style={{ background: "#6b8e4e", boxShadow: "0 2px 0 rgba(74,106,50,0.4)" }}
              >
                <User size={16} />
                View as {kid.name || "Kid"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit-layout toggle */}
      {!loading && (
        <div className="px-7 mt-4 flex justify-end">
          <button
            onClick={() => setEditingLayout((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pg-muted hover:text-pg-ink transition-colors"
          >
            {editingLayout ? <Check size={14} /> : <SettingsIcon size={14} />}
            {editingLayout ? "Done" : "Edit layout"}
          </button>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-pg-muted">Loading...</div>
      )}

      {!loading && (
        <div className="px-7 mt-5 flex flex-wrap gap-5">
          {order.map((id, idx) => {
            const content = renderModule(id);
            if (!content) return null;
            const isHalf = HALF_WIDTH_MODULES.has(id);
            const widthClass = isHalf ? "w-full lg:w-[calc(50%-10px)]" : "w-full";
            return (
              <div key={id} className={widthClass}>
                {editingLayout && (
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
                      {MODULE_LABELS[id] || id}
                      {isHalf && (
                        <span className="ml-2 normal-case text-pg-muted/70">· half-width</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-pg-line bg-white text-pg-ink disabled:opacity-30 hover:bg-pg-cream"
                        aria-label="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === order.length - 1}
                        className="p-1.5 rounded-lg border border-pg-line bg-white text-pg-ink disabled:opacity-30 hover:bg-pg-cream"
                        aria-label="Move down"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                )}
                <div
                  className={
                    editingLayout
                      ? "p-3 rounded-[14px] border-2 border-dashed border-pg-line"
                      : ""
                  }
                >
                  {content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ParentTabBar />
    </div>
  );
}
