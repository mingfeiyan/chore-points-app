"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import FlameIcon from "@/components/v2/FlameIcon";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import WeeklyCalendarView from "@/components/calendar/WeeklyCalendarView";
import PhotoCarousel from "@/components/dashboard/PhotoCarousel";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { toLocalDay } from "@/lib/date-utils";
import { getSundayWeekStart } from "@/lib/week-utils";

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

  const firstName = userName?.split(" ")[0] || "there";

  const fetchData = async () => {
    try {
      const kidsRes = await fetch("/api/family/kids");
      const kidsData = await kidsRes.json();
      if (!kidsRes.ok || !Array.isArray(kidsData.kids)) return;

      const enriched: KidWithPoints[] = await Promise.all(
        kidsData.kids.map(async (kid: Kid) => {
          const pointsRes = await fetch(`/api/points?kidId=${kid.id}`);
          const pointsData = await pointsRes.json();
          const entries: PointEntry[] = pointsData.entries || [];

          const todayEntries = entries.filter((e) => isToday(e.createdAt || e.date));
          const todayDelta = todayEntries.reduce((s, e) => s + e.points, 0);

          return {
            ...kid,
            totalPoints: pointsData.totalPoints || 0,
            todayDelta,
            todayEntries,
            allEntries: entries,
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

      {/* Stats — single-kid families keep the 4-tile row; multi-kid families
          get a compact card per kid so all are visible at once. */}
      {primaryKid && !loading && !isMultiKid && (
        <div className="mt-5 px-7 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: primaryKid.name || "Kid", value: primaryKid.totalPoints.toLocaleString(), sub: "total gems", tone: "#FFCB3B", showCoin: true },
            { label: "This week", value: `+${primaryStats.weekTotal}`, sub: "gems earned", tone: "#6b8e4e", showCoin: false },
            { label: "Streak", value: String(primaryStats.streak), sub: "days in a row", tone: "#c5543d", showCoin: false, showFlame: true },
            { label: "Badges", value: "—", sub: "earned", tone: "#d88b8b", showCoin: false },
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
      )}

      {isMultiKid && !loading && (
        <div className="mt-5 px-7 grid grid-cols-1 md:grid-cols-2 gap-3">
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
      )}

      {loading && (
        <div className="py-12 text-center text-pg-muted">Loading...</div>
      )}

      {/* Family Calendar */}
      <div className="mt-5 px-7">
        <WeeklyCalendarView />
      </div>

      {/* Today's activity + Photo side by side on desktop */}
      <div className="mt-5 px-7 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's activity */}
        {allTodayEntries.length > 0 && (
          <div>
            <div className="rounded-[14px] border border-[rgba(68,55,32,0.14)] bg-white p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-pg-ink">
                  {isMultiKid ? "Today's activity" : `${primaryKid?.name} today`}
                </h3>
              </div>
              {allTodayEntries.map((entry, i) => (
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
              ))}
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        <div>
          <PhotoCarousel />
        </div>
      </div>

      <ParentTabBar />
    </div>
  );
}
