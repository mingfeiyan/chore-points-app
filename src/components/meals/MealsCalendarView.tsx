"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import WeeklyCalendar from "./WeeklyCalendar";
import DayDetailModal from "./DayDetailModal";

type Tab = "calendar" | "vote" | "plan";

export default function MealsCalendarView() {
  const t = useTranslations("meals");

  // State for active tab (calendar is default)
  const [activeTab] = useState<Tab>("calendar");

  // State for DayDetailModal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Refresh key to force calendar refresh after saves
  const [refreshKey, setRefreshKey] = useState(0);

  // Handler for day click - opens DayDetailModal
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // Handler for modal save - triggers calendar refresh
  const handleSave = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Handler to close DayDetailModal
  const handleCloseDayModal = useCallback(() => {
    setSelectedDate(null);
  }, []);

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === "calendar"
              ? "bg-orange-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {t("mealPlan")}
        </button>
        <Link
          href="/meals/vote"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("vote")}
        </Link>
        <Link
          href="/meals/plan"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("planNextWeek")}
        </Link>
        <Link
          href="/meals/grocery"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("groceryList")}
        </Link>
        <Link
          href="/meals/dishes"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("dishLibrary")}
        </Link>
      </div>

      {/* Calendar View */}
      <WeeklyCalendar
        key={refreshKey}
        onDayClick={handleDayClick}
      />

      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          onClose={handleCloseDayModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
