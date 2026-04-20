"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import ParentTabBar from "@/components/v2/ParentTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import WeeklyCalendarView from "@/components/calendar/WeeklyCalendarView";
import PhotoCarousel from "@/components/dashboard/PhotoCarousel";
import { useKidMode } from "@/components/providers/KidModeProvider";

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

// ------- Sparkline -------

function getLast7DaysPoints(entries: PointEntry[]): number[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayTotal = entries
      .filter((e) => {
        const entryDate = new Date(e.date).toISOString().split("T")[0];
        return entryDate === dateStr && e.points > 0;
      })
      .reduce((sum, e) => sum + e.points, 0);

    result.push(dayTotal);
  }

  return result;
}

function Sparkline({ data }: { data: number[] }) {
  const width = 80;
  const height = 24;
  const padding = 2;

  const max = Math.max(...data, 1); // avoid division by zero
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data
    .map((val, i) => {
      const x = padding + i * stepX;
      // Invert Y: SVG y=0 is top, so higher values should be lower y
      const y = padding + (height - padding * 2) * (1 - val / max);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="7-day points sparkline"
    >
      <polyline
        points={points}
        stroke="#6b8e4e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
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

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="relative px-7 pt-8">
        {/* Botanical leaf SVG */}
        <svg
          className="pointer-events-none absolute right-4 top-4 opacity-30"
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M48 8C48 8 32 16 24 32C16 48 16 56 16 56C16 56 28 52 36 40C44 28 48 8 48 8Z"
            fill="#6b8e4e"
            opacity="0.5"
          />
          <path
            d="M16 56C16 56 20 36 32 24"
            stroke="#6b8e4e"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>

        {/* Date + weather */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          {formatDate(new Date())}
          {weather && (
            <span>
              {weather.location && ` · ${weather.location}`} · {weather.icon} {weather.temp}°F
            </span>
          )}
        </p>

        {/* Greeting */}
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-4xl font-medium text-pg-ink">
          {getGreeting()},{" "}
          <em className="not-italic font-medium italic text-pg-accent-deep">
            {firstName}
          </em>
        </h1>
      </div>

      {/* Kid cards */}
      <div className="mt-5 space-y-3 px-7">
        {loading && (
          <div className="py-8 text-center text-pg-muted">Loading...</div>
        )}
        {!loading &&
          kids.map((kid) => (
            <div
              key={kid.id}
              className="rounded-xl border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden"
            >
              {/* Main card content */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pg-accent text-white font-semibold text-sm shrink-0">
                  {(kid.name || kid.email)[0].toUpperCase()}
                </div>

                {/* Name + points */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-pg-ink">
                    {kid.name || kid.email}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-pg-muted">
                    <CoinSmall size={14} />
                    <span>{kid.totalPoints} pts</span>
                  </div>
                </div>

                {/* 7-day sparkline */}
                <Sparkline data={getLast7DaysPoints(kid.allEntries)} />

                {/* Today delta */}
                {kid.todayDelta > 0 && (
                  <span className="text-sm font-medium text-pg-accent-deep">
                    +{kid.todayDelta} today
                  </span>
                )}
              </div>

              {/* View as kid bar */}
              <button
                onClick={() => handleViewAsKid(kid)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-pg-accent-deep bg-[rgba(107,142,78,0.06)] border-t border-[rgba(68,55,32,0.08)] hover:bg-[rgba(107,142,78,0.12)] transition-colors"
              >
                <User size={14} />
                View as {kid.name || "Kid"}
              </button>
            </div>
          ))}
      </div>

      {/* Today's activity */}
      {allTodayEntries.length > 0 && (
        <div className="mt-5 px-7">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-pg-ink">
            Today&apos;s activity
          </h2>

          <div className="mt-3 rounded-xl border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden">
            {allTodayEntries.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < allTodayEntries.length - 1
                    ? "border-b border-[rgba(68,55,32,0.14)]"
                    : ""
                }`}
              >
                <span className="w-14 shrink-0 text-[11px] text-pg-muted">
                  {formatTime(entry.createdAt)}
                </span>
                <span className="flex-1 text-sm text-pg-ink">
                  {entry.chore?.title || entry.note || "Points"}
                </span>
                <span className="text-sm font-medium text-pg-accent-deep">
                  +{entry.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Calendar */}
      <div className="mt-5 px-7">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-pg-ink mb-3">
          Family calendar
        </h2>
        <div className="rounded-xl border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden p-4">
          <WeeklyCalendarView />
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="mt-5 px-7">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-pg-ink mb-3">
          Recent photos
        </h2>
        <div className="rounded-xl border border-[rgba(68,55,32,0.14)] bg-white overflow-hidden p-4">
          <PhotoCarousel />
        </div>
      </div>

      <ParentTabBar />
    </div>
  );
}
