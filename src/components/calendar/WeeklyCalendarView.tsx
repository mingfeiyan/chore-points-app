"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

interface CalendarSettings {
  isConnected: boolean;
  selectedCalendarName: string | null;
}

// Family member color mapping
const FAMILY_MEMBERS = [
  { name: "Jasper", color: "bg-purple-100 text-purple-800", dotColor: "bg-purple-500" },
  { name: "Mingfei", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  { name: "Yue", color: "bg-pink-100 text-pink-800", dotColor: "bg-pink-500" },
];

const DEFAULT_COLOR = { color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" };

// Detect which family member an event belongs to based on the title
function getEventColor(summary: string): { color: string; dotColor: string; member: string | null } {
  const lowerSummary = summary.toLowerCase();
  for (const member of FAMILY_MEMBERS) {
    if (lowerSummary.includes(member.name.toLowerCase())) {
      return { ...member, member: member.name };
    }
  }
  return { ...DEFAULT_COLOR, member: null };
}

export default function WeeklyCalendarView() {
  const t = useTranslations("calendar");
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const twoWeeksDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  const firstWeekDays = twoWeeksDays.slice(0, 7);
  const secondWeekDays = twoWeeksDays.slice(7, 14);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/settings");
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!settings?.isConnected) return;

    try {
      const twoWeeksEnd = new Date(currentWeekStart);
      twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 14);

      const res = await fetch(
        `/api/calendar/events?timeMin=${currentWeekStart.toISOString()}&timeMax=${twoWeeksEnd.toISOString()}`
      );
      const data = await res.json();

      if (res.ok) {
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, [settings?.isConnected, currentWeekStart]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings !== null) {
      if (settings.isConnected) {
        loadEvents();
      } else {
        setLoading(false);
      }
    }
  }, [settings, loadEvents]);

  const goToPreviousTwoWeeks = () => {
    setCurrentWeekStart((prev) => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() - 14);
      return newStart;
    });
  };

  const goToNextTwoWeeks = () => {
    setCurrentWeekStart((prev) => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() + 14);
      return newStart;
    });
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    setCurrentWeekStart(start);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => {
      const eventDate = event.start.date || event.start.dateTime?.split("T")[0];
      return eventDate === dateStr;
    });
  };

  const formatTime = (event: CalendarEvent) => {
    if (event.start.date) return t("allDay");
    if (event.start.dateTime) {
      const time = new Date(event.start.dateTime);
      return time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return "";
  };

  const dayNames = [
    t("sun"),
    t("mon"),
    t("tue"),
    t("wed"),
    t("thu"),
    t("fri"),
    t("sat"),
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings?.isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">{t("connectCalendar")}</h3>
          <p className="text-sm text-gray-500 mb-4">{t("connectDescription")}</p>
          <Link
            href="/calendar"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            {t("connect")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousTwoWeeks}
            className="p-1.5 hover:bg-gray-200 rounded transition"
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
          <button
            onClick={goToNextTwoWeeks}
            className="p-1.5 hover:bg-gray-200 rounded transition"
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

        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">
            {firstWeekDays[0].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {secondWeekDays[6].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t("today")}
          </button>
        </div>

        <Link
          href="/calendar"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t("viewFullCalendar") || "View Full Calendar"} &rarr;
        </Link>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 bg-gray-50 border-b text-xs">
        {FAMILY_MEMBERS.map((member) => (
          <div key={member.name} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${member.dotColor}`}></span>
            <span className="text-gray-600">{member.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${DEFAULT_COLOR.dotColor}`}></span>
          <span className="text-gray-600">{t("other") || "Other"}</span>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {dayNames.map((name, index) => (
          <div key={index} className="px-2 py-2 text-center text-xs text-gray-500 uppercase font-medium">
            {name}
          </div>
        ))}
      </div>

      {/* First Week Grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {firstWeekDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const todayClass = isToday(day) ? "bg-blue-50" : "";

          return (
            <div
              key={index}
              className={`min-h-[100px] ${todayClass}`}
            >
              {/* Day Number */}
              <div className="px-2 py-1 text-center">
                <div
                  className={`text-sm font-medium ${
                    isToday(day)
                      ? "w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white rounded-full"
                      : "text-gray-900"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="px-1 pb-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => {
                  const eventColor = getEventColor(event.summary);
                  return (
                    <div
                      key={event.id}
                      className={`text-xs ${eventColor.color} px-1 py-0.5 rounded truncate`}
                      title={`${formatTime(event)} - ${event.summary}`}
                    >
                      {event.summary}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{dayEvents.length - 2} {t("more")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider between weeks */}
      <div className="border-t border-gray-200"></div>

      {/* Second Week Grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {secondWeekDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const todayClass = isToday(day) ? "bg-blue-50" : "";

          return (
            <div
              key={index}
              className={`min-h-[100px] ${todayClass}`}
            >
              {/* Day Number */}
              <div className="px-2 py-1 text-center">
                <div
                  className={`text-sm font-medium ${
                    isToday(day)
                      ? "w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white rounded-full"
                      : "text-gray-900"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="px-1 pb-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => {
                  const eventColor = getEventColor(event.summary);
                  return (
                    <div
                      key={event.id}
                      className={`text-xs ${eventColor.color} px-1 py-0.5 rounded truncate`}
                      title={`${formatTime(event)} - ${event.summary}`}
                    >
                      {event.summary}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{dayEvents.length - 2} {t("more")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
