"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, User } from "lucide-react";
import ParentTabBar from "@/components/v2/ParentTabBar";
import OverflowMenu from "@/components/v2/OverflowMenu";
import CoinSmall from "@/components/v2/CoinSmall";
import LogRewardModal from "@/components/rewards/LogRewardModal";

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
  const [kids, setKids] = useState<KidWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);

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
  }, []);

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

  const overflowItems = [
    {
      label: "Log Reward",
      icon: <Gift size={16} />,
      onClick: () => setShowRewardModal(true),
    },
    {
      label: "View as Kid",
      icon: <User size={16} />,
      onClick: () => router.push("/points"),
    },
  ];

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

        {/* Overflow menu */}
        <div className="absolute right-5 top-8">
          <OverflowMenu items={overflowItems} />
        </div>

        {/* Date */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          {formatDate(new Date())}
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
              className="flex items-center gap-4 rounded-xl border border-[rgba(68,55,32,0.14)] bg-white p-4"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pg-accent text-white font-semibold text-sm">
                {(kid.name || kid.email)[0].toUpperCase()}
              </div>

              {/* Name + points */}
              <div className="flex-1">
                <p className="font-semibold text-pg-ink">
                  {kid.name || kid.email}
                </p>
                <div className="flex items-center gap-1 text-sm text-pg-muted">
                  <CoinSmall size={14} />
                  <span>{kid.totalPoints} pts</span>
                </div>
              </div>

              {/* Today delta */}
              {kid.todayDelta > 0 && (
                <span className="text-sm font-medium text-pg-accent-deep">
                  +{kid.todayDelta} today
                </span>
              )}
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

      {/* LogRewardModal */}
      {showRewardModal && (
        <LogRewardModal
          onClose={() => setShowRewardModal(false)}
          onSuccess={() => {
            fetchData();
            router.refresh();
          }}
        />
      )}

      <ParentTabBar />
    </div>
  );
}
