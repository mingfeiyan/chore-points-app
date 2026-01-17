"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ChoreFlashcards from "@/components/chores/ChoreFlashcards";
import PointsCalendar from "@/components/points/PointsCalendar";
import PointsCelebrationWrapper from "@/components/points/PointsCelebrationWrapper";
import BadgeShowcase from "@/components/badges/BadgeShowcase";

type PointEntry = {
  id: string;
  points: number;
  date: string;
  note?: string | null;
  photoUrl?: string | null;
  chore?: { title: string } | null;
};

type KidPointsViewProps = {
  kidId: string;
  readOnly?: boolean;
};

export default function KidPointsView({ kidId, readOnly = false }: KidPointsViewProps) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("points");
  const tCommon = useTranslations("common");
  const tBadges = useTranslations("badges");

  useEffect(() => {
    fetchPoints();
  }, [kidId]);

  const fetchPoints = async () => {
    try {
      const response = await fetch(`/api/points?kidId=${kidId}`);
      const data = await response.json();
      if (response.ok) {
        setTotalPoints(data.totalPoints);
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  return (
    <PointsCelebrationWrapper kidId={kidId} currentPoints={totalPoints}>
      {({ onReplay, canReplay }) => (
    <div>
      {/* Custom animation for slow spin */}
      <style jsx>{`
        @keyframes spin-slow {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        :global(.animate-spin-slow) {
          animation: spin-slow 2s linear infinite;
          transform-style: preserve-3d;
        }
      `}</style>

      {/* Points Score Card with Mario Coin */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="text-center">
            {/* Mario-style Coin Counter */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="relative w-16 h-16 animate-spin-slow">
                {/* Outer gold ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg" />
                {/* Inner darker circle */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-700" />
                {/* Highlight shine */}
                <div className="absolute top-2 left-3 w-4 h-6 bg-yellow-200 rounded-full opacity-60 blur-[1px]" />
                {/* Center star emblem */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-yellow-900 font-bold text-2xl opacity-70">★</span>
                </div>
              </div>
              <span className="text-7xl font-bold font-mono">× {totalPoints}</span>
            </div>
            <p className="text-sm mt-4 opacity-75">
              {t("keepUpGreatWork")}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Link
                href={readOnly ? "/view-as/points/history" : "/points/history"}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
              >
                {t("viewHistory")}
              </Link>
              <Link
                href={readOnly ? "/view-as/redeem" : "/redeem"}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-full text-sm font-medium transition-colors"
              >
                {t("redeemRewards")}
              </Link>
              {canReplay && (
                <button
                  onClick={onReplay}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-full text-sm font-medium transition-colors"
                >
                  🎉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar and Badges Side by Side */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {t("myCalendar")}
          </h2>
          <PointsCalendar entries={entries} />
        </div>

        {/* Badges Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {tBadges("myBadges")}
          </h2>
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <BadgeShowcase kidId={kidId} />
          </div>
        </div>
      </div>

      {/* Chore Flashcards Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t("choresYouCanDo")}
        </h2>
        <ChoreFlashcards />
      </div>
    </div>
      )}
    </PointsCelebrationWrapper>
  );
}
