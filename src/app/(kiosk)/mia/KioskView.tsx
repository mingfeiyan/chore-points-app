"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type ChoreItem = {
  id: string;
  title: string;
  emoji: string | null;
  defaultPoints: number;
  completedToday?: boolean;
  completedThisWeek?: boolean;
};

type KioskData = {
  kid: { id: string; name: string | null };
  totalPoints: number;
  chores: {
    morning: ChoreItem[];
    evening: ChoreItem[];
    weekly: ChoreItem[];
  };
  latestEntry: {
    id: string;
    points: number;
    choreTitle: string | null;
    note: string | null;
    date: string;
  } | null;
};

// ── Emoji fallback map ─────────────────────────────────────────────────────

const CHORE_EMOJI_MAP: Record<string, string> = {
  早上起床后尿尿: "🚽",
  早上自己穿衣服: "👔",
  穿鞋: "👟",
  安全带: "🚗",
  回家先洗手: "🧼",
  睡觉前撒尿: "🚽",
  "9点前睡觉就": "🕘",
  自己睡: "😴",
  中文课: "📖",
  武术课: "🥋",
  体操课: "🤸",
  刷牙: "🪥",
  洗澡: "🛁",
};

function getChoreEmoji(chore: ChoreItem): string {
  if (chore.emoji) return chore.emoji;
  // Try prefix match in fallback map
  for (const [key, emoji] of Object.entries(CHORE_EMOJI_MAP)) {
    if (chore.title.startsWith(key) || chore.title.includes(key)) return emoji;
  }
  return "⭐";
}

// ── Rain particle ──────────────────────────────────────────────────────────

function RainParticle({
  index,
  emoji,
}: {
  index: number;
  emoji: string;
}) {
  const left = useRef(Math.random() * 100).current;
  const delay = useRef(Math.random() * 0.8).current;
  const duration = useRef(1.5 + Math.random() * 1).current;
  const size = useRef(20 + Math.random() * 20).current;

  return (
    <span
      className="absolute pointer-events-none kiosk-gem-rain"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        fontSize: `${size}px`,
        top: "-40px",
      }}
    >
      {emoji}
    </span>
  );
}

// ── Chore tile ─────────────────────────────────────────────────────────────

function ChoreTile({ chore, done }: { chore: ChoreItem; done: boolean }) {
  const emoji = getChoreEmoji(chore);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl shadow-md transition-all duration-500 select-none
        ${done
          ? "bg-emerald-50 border-2 border-emerald-300"
          : "bg-white border-2 border-gray-100"
        }`}
      style={{ width: 110, height: 110 }}
    >
      {/* Status badge */}
      <div
        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
          ${done ? "bg-emerald-400 text-white" : "bg-red-400 text-white"}`}
      >
        {done ? "✓" : "!"}
      </div>

      {/* Emoji */}
      <span style={{ fontSize: 44, lineHeight: 1 }}>{emoji}</span>

      {/* Points */}
      <span className={`mt-1.5 text-base font-black ${done ? "text-emerald-600" : "text-gray-400"}`}>
        {chore.defaultPoints}
      </span>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

function ChoreSection({
  label,
  chores,
  isWeekly,
}: {
  label: string;
  chores: ChoreItem[];
  isWeekly?: boolean;
}) {
  if (chores.length === 0) return null;

  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-700 mb-2 px-1">{label}</h2>
      <div className="flex flex-wrap gap-3">
        {chores.map((chore) => (
          <ChoreTile
            key={chore.id}
            chore={chore}
            done={isWeekly ? !!chore.completedThisWeek : !!chore.completedToday}
          />
        ))}
      </div>
    </div>
  );
}

// ── Spinning coin ──────────────────────────────────────────────────────────

function SpinningCoin() {
  return (
    <div className="relative w-10 h-10 kiosk-spin-slow flex-shrink-0">
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-md" />
      <div className="absolute inset-1.5 rounded-full bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-700" />
      <div className="absolute top-1.5 left-2 w-3 h-4 bg-yellow-200 rounded-full opacity-60 blur-[1px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-yellow-900 font-bold text-base opacity-70">★</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

// ── PIN entry screen ───────────────────────────────────────────────────────

function PinEntry({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockedUntil <= Date.now()) { setCountdown(0); return; }
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setCountdown(0); setLockedUntil(0); setErrorMsg(null); }
      else setCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async () => {
    if (!pin || pin.length < 6 || countdown > 0) return;
    setChecking(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("kiosk_token", data.token);
        onSuccess(data.token);
      } else if (res.status === 429) {
        setLockedUntil(Date.now() + (data.lockedFor || 300) * 1000);
        setErrorMsg("Too many attempts. Try again later.");
        setPin("");
      } else {
        const left = data.attemptsLeft;
        setErrorMsg(left !== undefined && left <= 3
          ? `Wrong PIN. ${left} attempt${left !== 1 ? "s" : ""} left.`
          : "Wrong PIN. Try again.");
        setPin("");
      }
    } catch {
      setErrorMsg("Connection error.");
    } finally {
      setChecking(false);
    }
  };

  const locked = countdown > 0;
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full mx-4 text-center">
        <div className="text-5xl mb-4">{locked ? "⏳" : "🔒"}</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Kiosk PIN</h1>
        <p className="text-gray-500 text-sm mb-6">Enter the 6-digit family PIN</p>
        {locked ? (
          <div className="py-6">
            <p className="text-red-500 font-bold text-lg">Locked out</p>
            <p className="text-gray-500 text-2xl font-mono mt-2">
              {minutes}:{String(seconds).padStart(2, "0")}
            </p>
          </div>
        ) : (
          <>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••"
              className={`w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border-2 rounded-xl outline-none transition-colors ${
                errorMsg ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-indigo-400"
              }`}
              autoFocus
            />
            {errorMsg && <p className="text-red-500 text-sm mt-2">{errorMsg}</p>}
            <button
              onClick={handleSubmit}
              disabled={checking || pin.length < 6}
              className="w-full mt-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-lg transition-colors"
            >
              {checking ? "..." : "Enter"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function KioskView({ kidId }: { kidId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation state
  const [showEmoji, setShowEmoji] = useState(false);
  const [showRain, setShowRain] = useState(false);
  const [celebEmoji, setCelebEmoji] = useState("⭐");
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const prevEntryIdRef = useRef<string | null>(null);
  const prevTotalRef = useRef<number | null>(null);

  // Check for saved token on mount
  useEffect(() => {
    const saved = localStorage.getItem("kiosk_token");
    if (saved) setToken(saved);
    setAuthChecked(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/kiosk/${kidId}?token=${token}`, { cache: "no-store" });
      if (res.status === 401) {
        // Token expired or invalid — clear and show PIN
        localStorage.removeItem("kiosk_token");
        setToken(null);
        return;
      }
      if (!res.ok) {
        setError("Failed to load");
        return;
      }
      const newData: KioskData = await res.json();
      const newTotal = newData.totalPoints;
      const newEntryId = newData.latestEntry?.id ?? null;
      const prev = prevTotalRef.current;
      const prevId = prevEntryIdRef.current;

      if (prev !== null && newEntryId && newEntryId !== prevId && newTotal > prev) {
        // New point entry detected — trigger celebration
        const choreTitle = newData.latestEntry?.choreTitle ?? null;
        let emoji = "⭐";

        if (choreTitle) {
          const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
          const matches = choreTitle.match(emojiRegex);
          if (matches?.[0]) emoji = matches[0];
          else {
            for (const [key, e] of Object.entries(CHORE_EMOJI_MAP)) {
              if (choreTitle.startsWith(key) || choreTitle.includes(key)) {
                emoji = e;
                break;
              }
            }
          }
        }

        setCelebEmoji(emoji);
        prevEntryIdRef.current = newEntryId;
        prevTotalRef.current = newTotal;

        // Update chore board immediately (so tiles flip when animation ends)
        setData(newData);

        // Phase 1: Big emoji splash (3.5s)
        setShowEmoji(true);
        setShowRain(false);

        setTimeout(() => {
          // Phase 2: Counter roll + rain (2.5s)
          setShowEmoji(false);
          setShowRain(true);
          setTotalPoints(newTotal);
          setTimeout(() => setShowRain(false), 2500);
        }, 3500);
      } else {
        // Normal update — no animation
        if (prev === null) {
          setTotalPoints(newTotal);
          setDisplayedPoints(newTotal);
        }
        prevTotalRef.current = newTotal;
        prevEntryIdRef.current = newEntryId;
        setData(newData);
        setTotalPoints(newTotal);
      }
    } catch (err) {
      console.error("Kiosk fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [kidId, token]);

  useEffect(() => {
    if (token) fetchData();
  }, [fetchData, token]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Animate counter
  useEffect(() => {
    const start = displayedPoints;
    const end = totalPoints;
    if (start === end) return;

    const diff = end - start;
    const steps = Math.min(Math.abs(diff), 30);
    const stepDuration = 600 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayedPoints(Math.round(start + diff * progress));
      if (step >= steps) clearInterval(interval);
    }, stepDuration);

    return () => clearInterval(interval);
  }, [totalPoints]);

  // Show PIN entry if not authenticated
  if (authChecked && !token) {
    return <PinEntry onSuccess={(t) => setToken(t)} />;
  }

  if (loading || !authChecked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-4xl animate-pulse">⏳</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-50">
        <div className="text-2xl text-red-500">{error ?? "Not found"}</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes kiosk-spin-slow {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes kiosk-gem-rain-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(360deg); opacity: 0; }
        }
        @keyframes kiosk-counter-bump {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes kiosk-emoji-bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.08) translateY(-12px); }
        }
        .kiosk-spin-slow {
          animation: kiosk-spin-slow 2s linear infinite;
          transform-style: preserve-3d;
        }
        .kiosk-gem-rain {
          animation: kiosk-gem-rain-fall 2s ease-in forwards;
        }
        .kiosk-counter-bump {
          animation: kiosk-counter-bump 0.4s ease-out;
        }
        .kiosk-emoji-bounce {
          animation: kiosk-emoji-bounce 0.7s ease-in-out infinite;
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
        style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
      >
        {/* ── Points Hero (centered, ~25% height) ── */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white flex-shrink-0 relative overflow-hidden" style={{ height: "22vh" }}>
          {/* Phase 2 rain */}
          {showRain && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => (
                <RainParticle key={i} index={i} emoji={celebEmoji} />
              ))}
            </div>
          )}

          {/* Kid name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold text-white/80">
              {data.kid.name ?? "宝贝"}
            </span>
            <span className="text-xl">✨</span>
          </div>

          {/* Coin + points */}
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 kiosk-spin-slow flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-700" />
              <div className="absolute top-2 left-3 w-4 h-5 bg-yellow-200 rounded-full opacity-60 blur-[1px]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-yellow-900 font-bold text-xl opacity-70">★</span>
              </div>
            </div>
            <span
              className={`text-8xl font-black font-mono tracking-tight ${showRain ? "kiosk-counter-bump" : ""}`}
            >
              {displayedPoints}
            </span>
          </div>

          <p className="text-sm font-medium text-white/60 mt-1">积分</p>
        </div>

        {/* ── Board ── */}
        <div className="flex-1 overflow-hidden relative">
          {/* Phase 1: Big emoji splash */}
          {showEmoji && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="kiosk-emoji-bounce" style={{ fontSize: 160, lineHeight: 1 }}>
                {celebEmoji}
              </div>
            </div>
          )}

          <div className="h-full px-6 py-4 overflow-y-auto">
            <ChoreSection
              label="🌅 早上"
              chores={data.chores.morning}
            />
            <ChoreSection
              label="🌙 晚上"
              chores={data.chores.evening}
            />
            <ChoreSection
              label="📅 每周"
              chores={data.chores.weekly}
              isWeekly
            />
          </div>
        </div>
      </div>
    </>
  );
}
