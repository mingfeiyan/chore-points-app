"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  getDailyTotals,
  getDayIndicator,
  getDaysInMonth,
  getFirstDayOfMonth,
  toDateKey,
} from "@/lib/points-utils";

type PointEntry = {
  id: string;
  points: number;
  date: string;
};

type PointsCalendarProps = {
  entries: PointEntry[];
};

export default function PointsCalendar({ entries }: PointsCalendarProps) {
  const [today, setToday] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const t = useTranslations("calendar");

  const weekdays = t.raw("weekdays") as string[];
  const months = t.raw("months") as string[];

  useEffect(() => {
    setToday(new Date());
  }, []);

  const dailyTotals = getDailyTotals(entries);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isToday = (date: Date): boolean => {
    if (!today) return false;
    return toDateKey(date) === toDateKey(today);
  };

  const isFuture = (date: Date): boolean => {
    if (!today) return false;
    return date > today;
  };

  if (!today) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t("previousMonth")}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-gray-800">
          {months[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t("nextMonth")}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-xl">🔥</span>
          <span className="text-gray-600">{t("moreThan10")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xl">💎</span>
          <span className="text-gray-600">{t("oneOrMore")}</span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the first of the month */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {daysInMonth.map((date) => {
          const dateKey = toDateKey(date);
          const points = dailyTotals.get(dateKey) || 0;
          const indicator = getDayIndicator(points);
          const todayClass = isToday(date);
          const futureDay = isFuture(date);

          return (
            <div
              key={dateKey}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-colors ${
                todayClass
                  ? "bg-blue-100 ring-2 ring-blue-400"
                  : futureDay
                  ? "bg-gray-50"
                  : indicator === "fire"
                  ? "bg-orange-100"
                  : indicator === "star"
                  ? "bg-cyan-100"
                  : "bg-gray-100"
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  futureDay ? "text-gray-400" : "text-gray-700"
                }`}
              >
                {date.getDate()}
              </span>
              {!futureDay && indicator !== "none" && (
                <span className="text-lg leading-none">
                  {indicator === "fire" ? "🔥" : "💎"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
