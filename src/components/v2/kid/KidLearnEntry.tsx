"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BookOpen, Hash, RotateCcw, Sparkles, BookMarked, PartyPopper } from "lucide-react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import CoinSmall from "@/components/v2/CoinSmall";
import LearnView from "@/components/learn/LearnView";
import MathModule from "@/components/learn/MathModule";

type SessionData = {
  words: Array<{ id: string; word: string; imageUrl: string | null }>;
  isReview?: boolean;
  progress: { current: number; total: number };
  message?: "noWords" | "alreadyDoneToday";
};

interface KidLearnEntryProps {
  kidId?: string;
}

export default function KidLearnEntry({ kidId: kidIdProp }: KidLearnEntryProps = {}) {
  const { data: session } = useSession();
  const resolvedKidId = kidIdProp || session?.user?.id;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sight-words" | "math">("sight-words");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!resolvedKidId) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/sight-words/session?kidId=${resolvedKidId}&timezone=${encodeURIComponent(tz)}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Failed to fetch session:", err))
      .finally(() => setLoading(false));
  }, [resolvedKidId]);

  const progress = data?.progress || { current: 0, total: 0 };
  const wordCount = data?.words?.length || 0;
  const isReview = data?.isReview || false;
  const allDone = data?.message === "alreadyDoneToday";
  const noWords = data?.message === "noWords";

  // When started, show the learning session inline
  if (started) {
    return (
      <div className="min-h-screen bg-ca-cream pb-[110px] font-[family-name:var(--font-nunito)]">
        <KidHeaderBG compact>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black font-[family-name:var(--font-baloo-2)]">
              {activeTab === "sight-words" ? "Sight Words" : "Math"}
            </h1>
            <button
              onClick={() => setStarted(false)}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white/20"
            >
              Back
            </button>
          </div>
        </KidHeaderBG>
        <div className="px-4 mt-4">
          {activeTab === "sight-words" ? (
            <LearnView kidId={resolvedKidId} onComplete={() => setStarted(false)} />
          ) : (
            <MathModule kidId={resolvedKidId} onComplete={() => setStarted(false)} />
          )}
        </div>
        <KidTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ca-cream pb-[110px] font-[family-name:var(--font-nunito)]">
      {/* Header */}
      <KidHeaderBG>
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
          Earn gems by learning
        </p>
        <h1 className="text-2xl font-black font-[family-name:var(--font-baloo-2)] mt-0.5">
          Learning Center
        </h1>

        {/* Subject tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab("sight-words")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            style={{
              background: activeTab === "sight-words" ? "#fff" : "rgba(255,255,255,0.2)",
              color: activeTab === "sight-words" ? "var(--ca-cobalt-deep)" : "#fff",
            }}
          >
            <BookOpen size={16} /> Sight Words
          </button>
          <button
            onClick={() => setActiveTab("math")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            style={{
              background: activeTab === "math" ? "#fff" : "rgba(255,255,255,0.2)",
              color: activeTab === "math" ? "var(--ca-cobalt-deep)" : "#fff",
            }}
          >
            <Hash size={16} /> Math
          </button>
        </div>
      </KidHeaderBG>

      <div className="px-4 mt-5 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-ca-muted">Loading...</div>
        ) : activeTab === "sight-words" ? (
          <>
            {/* Progress bar */}
            {progress.total > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-base font-extrabold text-ca-ink">
                    {isReview ? "Review Progress" : "Learning Progress"}
                  </h2>
                  <span className="text-sm font-bold text-ca-muted">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[rgba(26,24,19,0.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                      background: "linear-gradient(90deg, var(--ca-cobalt), var(--ca-sky))",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Session card */}
            {allDone ? (
              <div className="bg-white rounded-2xl p-5 border border-[rgba(26,24,19,0.06)] text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ca-tile-mint mb-2">
                  <PartyPopper size={28} className="text-ca-mint" />
                </div>
                <h3 className="text-lg font-extrabold text-ca-ink mt-2">All done for today!</h3>
                <p className="text-sm text-ca-muted mt-1">Great job! Come back tomorrow for more.</p>
              </div>
            ) : noWords ? (
              <div className="bg-white rounded-2xl p-5 border border-[rgba(26,24,19,0.06)] text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ca-tile-teal mb-2">
                  <BookMarked size={28} className="text-ca-teal" />
                </div>
                <h3 className="text-lg font-extrabold text-ca-ink mt-2">No words yet</h3>
                <p className="text-sm text-ca-muted mt-1">Ask a parent to add sight words.</p>
              </div>
            ) : (
              <>
                {/* Review / New words card */}
                {isReview && wordCount > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-[rgba(26,24,19,0.06)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-ca-tile-peach flex items-center justify-center shrink-0">
                      <RotateCcw size={24} className="text-ca-peach" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-extrabold text-ca-ink">Review time!</h3>
                      <p className="text-xs text-ca-muted mt-0.5">
                        Practice the {progress.current} words you&apos;ve learned
                      </p>
                    </div>
                    <button
                      onClick={() => setStarted(true)}
                      className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-sm"
                      style={{ background: "var(--ca-coral)" }}
                    >
                      Start
                    </button>
                  </div>
                )}

                {/* New words hero card */}
                <div
                  className="rounded-3xl p-6 text-white text-center relative overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 70%, #0d2480 100%)",
                  }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/15">
                    <Sparkles size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-black mt-3 font-[family-name:var(--font-baloo-2)]">
                    Let&apos;s learn {wordCount} {isReview ? "review" : "new"} words!
                  </h3>
                  <p className="text-sm opacity-80 mt-1">
                    Look and listen first, then we&apos;ll test you.
                  </p>

                  <button
                    onClick={() => setStarted(true)}
                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full text-sm font-extrabold"
                    style={{ background: "var(--ca-gold)", color: "var(--ca-gold-deep)" }}
                  >
                    <CoinSmall size={16} />
                    Start learning →
                  </button>

                  <p className="text-xs opacity-60 mt-3">
                    +1 gem per word learned
                  </p>
                </div>
              </>
            )}
          </>
        ) : (
          /* Math tab */
          <div className="bg-white rounded-2xl p-5 border border-[rgba(26,24,19,0.06)] text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ca-tile-peach mb-2">
              <Hash size={28} className="text-ca-peach" />
            </div>
            <h3 className="text-lg font-extrabold text-ca-ink mt-2">Math Practice</h3>
            <p className="text-sm text-ca-muted mt-1">Coming soon!</p>
          </div>
        )}
      </div>

      <KidTabBar />
    </div>
  );
}
