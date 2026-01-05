"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ChoreFlashcards from "@/components/chores/ChoreFlashcards";
import PointsCalendar from "@/components/points/PointsCalendar";
import PointsProgression from "@/components/points/PointsProgression";

type PointEntry = {
  id: string;
  points: number;
  date: string;
};

type KidPointsViewProps = {
  kidId: string;
};

export default function KidPointsView({ kidId }: KidPointsViewProps) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("points");
  const tCommon = useTranslations("common");

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

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
    <div>
      {/* Points Score Card */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="text-center">
            <p className="text-lg font-medium opacity-90">{t("myPoints")}</p>
            <p className="text-7xl font-bold mt-2">{totalPoints}</p>
            <p className="text-sm mt-4 opacity-75">
              {t("keepUpGreatWork")}
            </p>
            <Link
              href="/points/history"
              className="inline-block mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
            >
              {t("viewHistory")}
            </Link>
          </div>
        </div>
      </div>

      {/* Chore Flashcards Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t("choresYouCanDo")}
        </h2>
        <ChoreFlashcards />
      </div>

      {/* Calendar and Progression Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar View */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("myCalendar")}
          </h2>
          <PointsCalendar entries={entries} />
        </div>

        {/* Progression Chart */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("thisMonth")}
          </h2>
          <PointsProgression
            entries={entries}
            month={currentMonth}
            year={currentYear}
          />
        </div>
      </div>
    </div>
  );
}
