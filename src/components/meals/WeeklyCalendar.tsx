"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getWeekStart } from "@/lib/week-utils";

// Daily item emoji mapping
const DAILY_ITEM_EMOJI: Record<string, string> = {
  fruit: "🍎",
  milk: "🥛",
  vitamin: "💊",
  eggs: "🥚",
  yogurt: "🥛",
};

// Helper to format date as YYYY-MM-DD
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Types matching the API response
type DishEntry = {
  id: string;
  dishId: string | null;
  dishName: string;
  isFreeForm: boolean;
  dish: {
    id: string;
    name: string;
    photoUrl: string;
  } | null;
};

type MealEntry = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER";
  notes: string | null;
  dishes: DishEntry[];
};

type DailyItem = {
  id: string;
  name: string;
};

type DailyMealLog = {
  id: string;
  date: string;
  notes: string | null;
  meals: MealEntry[];
  dailyItems: DailyItem[];
};

type WeeklyCalendarProps = {
  onDayClick: (date: Date) => void;
};

export default function WeeklyCalendar({ onDayClick }: WeeklyCalendarProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const tCalendar = useTranslations("calendar");

  // Current week start (Saturday)
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [logs, setLogs] = useState<DailyMealLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate week end (Friday)
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Generate array of 7 days for the week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  // Day names for the week (Sat-Fri)
  const dayNames = [
    tCalendar("sat"),
    tCalendar("sun"),
    tCalendar("mon"),
    tCalendar("tue"),
    tCalendar("wed"),
    tCalendar("thu"),
    tCalendar("fri"),
  ];

  // Fetch daily meal logs for the week
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const startStr = toDateString(weekStart);
      const endStr = toDateString(weekEnd);
      const response = await fetch(`/api/daily-meals?start=${startStr}&end=${endStr}`);
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch daily meals:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Create a map of date string -> log
  const logsByDate = useMemo(() => {
    const map: Record<string, DailyMealLog> = {};
    logs.forEach((log) => {
      // Parse the date and convert to local date string
      const logDate = new Date(log.date);
      const dateStr = toDateString(logDate);
      map[dateStr] = log;
    });
    return map;
  }, [logs]);

  // Navigation handlers
  const goToPreviousWeek = () => {
    const prevWeek = new Date(weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setWeekStart(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setWeekStart(nextWeek);
  };

  const goToToday = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if a date is in the past
  const isPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  // Check if viewing current week
  const isCurrentWeek = useMemo(() => {
    const currentWeekStart = getWeekStart(new Date());
    return weekStart.getTime() === currentWeekStart.getTime();
  }, [weekStart]);

  // Format week range for header
  const weekRangeText = useMemo(() => {
    const startMonth = weekStart.toLocaleDateString(undefined, { month: "short" });
    const endMonth = weekEnd.toLocaleDateString(undefined, { month: "short" });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }, [weekStart, weekEnd]);

  // Get meal type label
  const mealTypeLabel = (type: string): string => {
    switch (type) {
      case "BREAKFAST":
        return t("breakfast");
      case "LUNCH":
        return t("lunch");
      case "DINNER":
        return t("dinner");
      default:
        return type.toLowerCase();
    }
  };

  // Get daily item emoji or first letter
  const getDailyItemIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    for (const [key, emoji] of Object.entries(DAILY_ITEM_EMOJI)) {
      if (lowerName.includes(key)) {
        return emoji;
      }
    }
    // Return first character as fallback
    return name.charAt(0).toUpperCase();
  };

  // Render day cell content
  const renderDayContent = (date: Date) => {
    const dateStr = toDateString(date);
    const log = logsByDate[dateStr];
    const past = isPast(date);

    // No log for this day
    if (!log || (log.meals.length === 0 && log.dailyItems.length === 0)) {
      return (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <span className="text-2xl text-gray-300 hover:text-orange-400 transition-colors">+</span>
        </div>
      );
    }

    return (
      <div className="space-y-1 p-1">
        {/* Meals summary */}
        {log.meals.slice(0, 2).map((meal) => (
          <div key={meal.id} className="text-xs truncate">
            <span className={`font-medium ${past ? "text-gray-500" : "text-gray-700"}`}>
              {mealTypeLabel(meal.mealType).charAt(0).toLowerCase()}:
            </span>{" "}
            <span className={past ? "text-gray-400" : "text-gray-600"}>
              {meal.dishes.map((d) => d.dishName).join(", ") || "-"}
            </span>
          </div>
        ))}
        {log.meals.length > 2 && (
          <div className="text-xs text-gray-400">+{log.meals.length - 2} more</div>
        )}

        {/* Daily items as emoji row */}
        {log.dailyItems.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {log.dailyItems.map((item) => (
              <span
                key={item.id}
                className="text-sm"
                title={item.name}
              >
                {getDailyItemIcon(item.name)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
          aria-label="Previous week"
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

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{weekRangeText}</h3>
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              {tCalendar("today")}
            </button>
          )}
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
          )}
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
          aria-label="Next week"
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

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {dayNames.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Date numbers row */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((date) => {
          const today = isToday(date);
          const past = isPast(date);

          return (
            <div
              key={toDateString(date)}
              className={`py-2 text-center border-r last:border-r-0 ${
                today ? "bg-orange-50" : past ? "bg-gray-50" : ""
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full ${
                  today
                    ? "bg-orange-500 text-white"
                    : past
                    ? "text-gray-400"
                    : "text-gray-700"
                }`}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Day cells with meal content */}
      <div className="grid grid-cols-7">
        {weekDays.map((date) => {
          const today = isToday(date);
          const past = isPast(date);
          const dateStr = toDateString(date);

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(date)}
              className={`min-h-[80px] sm:min-h-[100px] border-r border-b last:border-r-0 p-1 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 ${
                today ? "bg-orange-50/50" : past ? "bg-gray-50/50" : ""
              }`}
            >
              {renderDayContent(date)}
            </button>
          );
        })}
      </div>

      {/* Loading overlay */}
      {loading && logs.length === 0 && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="text-gray-500">{tCommon("loading")}</div>
        </div>
      )}
    </div>
  );
}
