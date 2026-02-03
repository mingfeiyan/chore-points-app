"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import WeeklyCalendar from "./WeeklyCalendar";
import DayDetailModal from "./DayDetailModal";
import BulkPlanningModal from "./BulkPlanningModal";

type Tab = "calendar" | "vote" | "results";

export default function MealsCalendarView() {
  const t = useTranslations("meals");

  // State for active tab (calendar is default)
  const [activeTab] = useState<Tab>("calendar");

  // State for DayDetailModal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // State for BulkPlanningModal
  const [showPlanningModal, setShowPlanningModal] = useState(false);

  // Refresh key to force calendar refresh after saves
  const [refreshKey, setRefreshKey] = useState(0);

  // Handler for day click - opens DayDetailModal
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // Handler for "Plan Week" button - opens BulkPlanningModal
  const handlePlanWeek = useCallback(() => {
    setShowPlanningModal(true);
  }, []);

  // Handler for modal save - triggers calendar refresh
  const handleSave = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Handler to close DayDetailModal
  const handleCloseDayModal = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // Handler to close BulkPlanningModal
  const handleClosePlanningModal = useCallback(() => {
    setShowPlanningModal(false);
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
        <button
          onClick={handlePlanWeek}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("planNextWeek")}
        </button>
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

      {/* Bulk Planning Modal */}
      {showPlanningModal && (
        <BulkPlanningModal
          onClose={handleClosePlanningModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
