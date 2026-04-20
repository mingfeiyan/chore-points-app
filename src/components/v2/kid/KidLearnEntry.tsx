"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import Gemmy from "@/components/v2/Gemmy";

type SessionInfo = {
  wordCount?: number;
  subject?: string;
};

const subjectTiles = [
  { name: "Sight Words", icon: "\uD83D\uDCDA", bg: "bg-ca-tile-teal", href: "/learn/sight-words" },
  { name: "Addition", icon: "\u2795", bg: "bg-ca-tile-peach", href: "/learn/addition" },
  { name: "Multiplication", icon: "\u2716\uFE0F", bg: "bg-ca-tile-butter", href: "/learn/multiplication" },
  { name: "Speed Round", icon: "\u26A1", bg: "bg-ca-tile-pink", href: "/learn/speed-round" },
];

export default function KidLearnEntry() {
  const { data: session } = useSession();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchSessionInfo();
  }, [session?.user?.id]);

  const fetchSessionInfo = async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(
        `/api/sight-words/session?kidId=${session?.user?.id}&timezone=${encodeURIComponent(tz)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSessionInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch session info:", err);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = sessionInfo?.wordCount || 10;

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
          <h1 className="text-2xl font-black font-[family-name:var(--font-baloo-2)]">Learn</h1>
        </div>
      </KidHeaderBG>

      <div className="px-4 mt-4 space-y-4">
        {/* Today's session hero card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="flex-shrink-0">
            <Gemmy size={72} mood="happy" bounce />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-ca-ink">Today&apos;s session</h2>
            <p className="text-sm text-ca-muted">
              Sight Words &middot; {"\u00D7"}{wordCount} words
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-ca-muted">~2 min</span>
              <span className="flex items-center gap-0.5 text-xs text-ca-muted">
                <CoinSmall size={14} /> +5
              </span>
            </div>
            <Link
              href="/learn/sight-words"
              className="mt-2 inline-block bg-ca-cobalt text-white text-sm font-bold px-5 py-1.5 rounded-xl"
            >
              Start
            </Link>
          </div>
        </div>

        {/* Subject tiles */}
        <div className="grid grid-cols-2 gap-3">
          {subjectTiles.map((tile) => (
            <Link
              key={tile.name}
              href={tile.href}
              className={`${tile.bg} rounded-2xl p-4 flex flex-col items-center justify-center aspect-square shadow-sm`}
            >
              <span className="text-3xl mb-2">{tile.icon}</span>
              <span className="text-sm font-bold text-ca-ink text-center">{tile.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <KidTabBar />
    </div>
  );
}
