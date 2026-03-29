"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type ChoreItem = {
  id: string;
  title: string;
  emoji: string | null;
  defaultPoints: number;
  completedToday?: boolean;
  completedThisWeek?: boolean;
  weekdayOnly?: boolean;
  activeToday?: boolean;
};

type BonusStatus = {
  total: number;
  completed: number;
  bonusAwarded: boolean;
};

type KioskData = {
  kid: { id: string; name: string | null };
  totalPoints: number;
  totalEarned: number;
  chores: {
    morning: ChoreItem[];
    evening: ChoreItem[];
    weekly: ChoreItem[];
  };
  bonuses?: {
    morning?: BonusStatus;
    evening?: BonusStatus;
    weekly?: BonusStatus;
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

function getChoreEmoji(chore: ChoreItem): string {
  // Use icon from DB (set via chore form), or extract from title text
  if (chore.emoji) return chore.emoji;
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  const match = chore.title.match(emojiRegex);
  if (match?.[0]) return match[0];
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

// ── Flashcard-style chore tile ─────────────────────────────────────────────

// Color palette matching ChoreFlashcards on the kid view
const TILE_COLORS = [
  "from-pink-400 to-pink-500",
  "from-purple-400 to-purple-500",
  "from-indigo-400 to-indigo-500",
  "from-blue-400 to-blue-500",
  "from-cyan-400 to-cyan-500",
  "from-teal-400 to-teal-500",
  "from-green-400 to-green-500",
  "from-yellow-400 to-yellow-500",
  "from-orange-400 to-orange-500",
  "from-red-400 to-red-500",
];

function ChoreTile({ chore, done, colorIndex }: { chore: ChoreItem; done: boolean; colorIndex: number }) {
  const emoji = getChoreEmoji(chore);
  const gradient = TILE_COLORS[colorIndex % TILE_COLORS.length];

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl shadow-lg transition-all duration-500 select-none text-white overflow-hidden bg-gradient-to-br ${gradient}`}
      style={{ width: 165, height: 165, opacity: done ? 0.55 : 1 }}
    >
      {/* White overlay to soften the gradient */}
      <div className="absolute inset-0 bg-white/30 pointer-events-none" />

      {/* Status badge — green ✓ when done, red ! when not */}
      <div
        className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shadow
          ${done ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
      >
        {done ? "✓" : "!"}
      </div>

      {/* Emoji */}
      <span className="relative z-10 text-5xl" style={{ lineHeight: 1 }}>{emoji}</span>

      {/* Title */}
      <h3 className="relative z-10 mt-2 font-bold text-sm leading-tight text-center px-2 text-white"
        style={{ maxWidth: 150, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
      >
        {chore.title}
      </h3>

      {/* Points badge */}
      <span className={`relative z-10 mt-1 rounded-full px-3 py-0.5 text-xs font-semibold ${done ? "bg-white/40" : "bg-white/30"}`}>
        +{chore.defaultPoints} 分
      </span>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────



function ChoreSection({
  label,
  chores,
  isWeekly,
  colorOffset,
}: {
  label: string;
  chores: ChoreItem[];
  isWeekly?: boolean;
  colorOffset?: number;
}) {
  if (chores.length === 0) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-lg">
      No chores in this category
    </div>
  );

  const offset = colorOffset ?? 0;

  // Split into bonus-eligible (activeToday) and extras
  const bonusChores = chores.filter((c) => c.activeToday !== false);
  const extraChores = chores.filter((c) => c.activeToday === false);

  return (
    <div>
      {/* Bonus-eligible chores */}
      <div className="flex flex-wrap gap-3">
        {bonusChores.map((chore, i) => (
          <ChoreTile
            key={chore.id}
            chore={chore}
            done={isWeekly ? !!chore.completedThisWeek : !!chore.completedToday}
            colorIndex={offset + i}
          />
        ))}
      </div>

      {/* Extra chores (don't count toward bonus) */}
      {extraChores.length > 0 && (
        <>
          <div className="flex items-center gap-3 my-3 px-1">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">额外任务 · 不计全勤</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
          <div className="flex flex-wrap gap-3">
            {extraChores.map((chore, i) => (
              <ChoreTile
                key={chore.id}
                chore={chore}
                done={isWeekly ? !!chore.completedThisWeek : !!chore.completedToday}
                colorIndex={offset + bonusChores.length + i}
              />
            ))}
          </div>
        </>
      )}
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

type TabKey = "morning" | "evening" | "weekly";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "morning", label: "早上", emoji: "🌅" },
  { key: "evening", label: "晚上", emoji: "🌙" },
  { key: "weekly", label: "每周", emoji: "📅" },
];

export default function KioskView({ kidId }: { kidId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("morning");

  // Animation state
  const [showEmoji, setShowEmoji] = useState(false);
  const [showRain, setShowRain] = useState(false);
  const [celebEmoji, setCelebEmoji] = useState("⭐");
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const prevEntryIdRef = useRef<string | null>(null);
  const prevTotalRef = useRef<number | null>(null);

  // Compute today's date and current week range (Mon-Sun) in PT
  const { todayFormatted, weekRangeFormatted } = useMemo(() => {
    const now = new Date();
    const ptNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const month = ptNow.getMonth() + 1;
    const date = ptNow.getDate();
    const day = ptNow.getDay(); // 0=Sun
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(ptNow);
    monday.setDate(ptNow.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      todayFormatted: `${month}月${date}日`,
      weekRangeFormatted: `${fmt(monday)} - ${fmt(sunday)}`,
    };
  }, []);

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
        // Use the same getChoreEmoji() as tiles to guarantee matching emoji
        const choreTitle = newData.latestEntry?.choreTitle ?? null;
        const note = newData.latestEntry?.note ?? null;
        let emoji = "⭐";

        if (choreTitle) {
          // Find the matching chore in loaded data to use the same emoji logic as tiles
          const allChores = [...newData.chores.morning, ...newData.chores.evening, ...newData.chores.weekly];
          const matchedChore = allChores.find((c) => c.title === choreTitle);
          if (matchedChore) {
            emoji = getChoreEmoji(matchedChore);
          } else {
            // Chore not in current schedule — extract from title text
            const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
            const matches = choreTitle.match(emojiRegex);
            if (matches?.[0]) emoji = matches[0];
          }
        } else if (note) {
          // No chore linked (ad-hoc award) — try extracting emoji from note
          const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
          const matches = note.match(emojiRegex);
          if (matches?.[0]) emoji = matches[0];
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
        <div className="flex items-center justify-between bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white flex-shrink-0 relative overflow-hidden px-6" style={{ height: "22vh" }}>
          {/* Phase 2 rain */}
          {showRain && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => (
                <RainParticle key={i} index={i} emoji={celebEmoji} />
              ))}
            </div>
          )}

          {/* Left: Lifetime Earned */}
          <div className="flex-1 z-10">
            {data.totalEarned > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 inline-block">
                <p className="text-xs text-white/60 mb-0.5">🏆 历史总积分</p>
                <p className="text-3xl font-bold font-mono">{data.totalEarned}</p>
                <p className="text-xs text-white/50">分</p>
              </div>
            )}
          </div>

          {/* Center: Kid name + Coin + Points */}
          <div className="flex flex-col items-center flex-shrink-0 z-10">
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

          {/* Right: Today's Date + Week Range */}
          <div className="flex-1 flex justify-end z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 inline-block text-right">
              <p className="text-xs text-white/60 mb-0.5">📅 今天</p>
              <p className="text-lg font-semibold">{todayFormatted}</p>
              <div className="mt-1.5 pt-1.5 border-t border-white/20">
                <p className="text-xs text-white/60 mb-0.5">🌟 本周全勤</p>
                <p className="text-lg font-semibold">{weekRangeFormatted}</p>
              </div>
            </div>
          </div>
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

          {/* Tab buttons */}
          <div className="flex px-4 pt-3 pb-1 gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const bonus = data.bonuses?.[tab.key];
              const completed = bonus?.completed ?? 0;
              const total = bonus?.total ?? data.chores[tab.key].length;
              const allDone = total > 0 && completed === total;
              const bonusAwarded = bonus?.bonusAwarded ?? false;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-3.5 rounded-xl font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white text-gray-500 border-2 border-gray-200"
                  }`}
                >
                  <span style={{ fontSize: 22 }}>{tab.emoji}</span>
                  <span className="ml-1 text-lg">{tab.label}</span>
                  <span className={`ml-1.5 text-base font-bold px-2 py-0.5 rounded-full ${
                    isActive ? "bg-white/20" : "bg-gray-100"
                  }`}>
                    {completed}/{total}
                  </span>
                  <span className={`ml-1.5 text-base ${allDone || bonusAwarded
                    ? (isActive ? "text-yellow-300 font-bold" : "text-yellow-500 font-bold")
                    : (isActive ? "text-white/40" : "text-gray-300")
                  }`}>
                    {allDone || bonusAwarded ? "🌟+5" : "全勤+5"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          <div className="flex-1 px-6 py-4 overflow-y-auto">
            <ChoreSection
              label=""
              chores={data.chores[activeTab]}
              isWeekly={activeTab === "weekly"}
              colorOffset={activeTab === "morning" ? 0 : activeTab === "evening" ? 3 : 6}
            />
          </div>
        </div>
      </div>
    </>
  );
}
