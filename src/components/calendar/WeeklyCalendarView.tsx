"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
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

// Detect family member from event title and return member name and clean title
function parseMemberFromTitle(title: string): { member: string; cleanTitle: string } {
  const lowerTitle = title.toLowerCase();
  for (const member of FAMILY_MEMBERS) {
    const lowerMember = member.name.toLowerCase();
    // Check for patterns like "Jasper - Event" or "Jasper: Event" or "Jasper's Event"
    const patterns = [
      new RegExp(`^${lowerMember}\\s*[-:]\\s*`, "i"),
      new RegExp(`^${lowerMember}'s\\s+`, "i"),
    ];
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return { member: member.name, cleanTitle: title.replace(pattern, "") };
      }
    }
    // Also check if name appears anywhere in title
    if (lowerTitle.includes(lowerMember)) {
      return { member: member.name, cleanTitle: title };
    }
  }
  return { member: "", cleanTitle: title };
}

// Format the final event title with member prefix
function formatTitleWithMember(title: string, member: string): string {
  if (!member) return title;
  // Don't add prefix if name is already in title
  if (title.toLowerCase().includes(member.toLowerCase())) return title;
  return `${member} - ${title}`;
}

export default function WeeklyCalendarView() {
  const t = useTranslations("calendar");
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    summary: "",
    selectedMember: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    allDay: false,
  });
  const [isCreating, setIsCreating] = useState(false);
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

  // Mobile view: 6 days starting from mobileStartDate
  const [mobileStartDate, setMobileStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const mobileDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 6; i++) {
      const day = new Date(mobileStartDate);
      day.setDate(mobileStartDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [mobileStartDate]);

  const goToPreviousMobileWeek = () => {
    setMobileStartDate((prev) => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() - 6);
      return newStart;
    });
  };

  const goToNextMobileWeek = () => {
    setMobileStartDate((prev) => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() + 6);
      return newStart;
    });
  };

  const goToMobileToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setMobileStartDate(today);
  };

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

  const startCreateMode = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentTime = today.toTimeString().slice(0, 5);
    // Default to 1 hour duration
    const endTime = new Date(today);
    endTime.setHours(endTime.getHours() + 1);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    setEditForm({
      summary: "",
      selectedMember: "",
      description: "",
      location: "",
      startDate: todayStr,
      startTime: currentTime,
      endDate: todayStr,
      endTime: endTimeStr,
      allDay: false,
    });
    setIsCreating(true);
  };

  const handleCreateEvent = async () => {
    setIsSaving(true);

    try {
      // Format the title with family member if selected
      const finalSummary = formatTitleWithMember(editForm.summary, editForm.selectedMember);

      const eventData: {
        summary: string;
        description?: string;
        location?: string;
        start: { date?: string; dateTime?: string };
        end: { date?: string; dateTime?: string };
      } = {
        summary: finalSummary,
        description: editForm.description || undefined,
        location: editForm.location || undefined,
        start: {},
        end: {},
      };

      if (editForm.allDay) {
        eventData.start = { date: editForm.startDate };
        // Add 1 day to end for Google Calendar all-day events
        const endDate = new Date(editForm.endDate + "T00:00:00");
        endDate.setDate(endDate.getDate() + 1);
        eventData.end = { date: endDate.toISOString().split("T")[0] };
      } else {
        eventData.start = { dateTime: new Date(`${editForm.startDate}T${editForm.startTime}`).toISOString() };
        eventData.end = { dateTime: new Date(`${editForm.endDate}T${editForm.endTime}`).toISOString() };
      }

      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        setIsCreating(false);
        loadEvents();
      } else {
        console.error("Failed to create event");
      }
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditMode = (event: CalendarEvent) => {
    const isAllDay = !!event.start.date;
    let startDate = "";
    let startTime = "";
    let endDate = "";
    let endTime = "";

    if (isAllDay) {
      startDate = event.start.date || "";
      endDate = event.end.date || "";
      // Subtract 1 day from end since Google all-day events end on next day
      if (endDate) {
        const end = new Date(endDate + "T00:00:00");
        end.setDate(end.getDate() - 1);
        endDate = end.toISOString().split("T")[0];
      }
    } else if (event.start.dateTime) {
      const start = new Date(event.start.dateTime);
      startDate = start.toISOString().split("T")[0];
      startTime = start.toTimeString().slice(0, 5);
      if (event.end.dateTime) {
        const end = new Date(event.end.dateTime);
        endDate = end.toISOString().split("T")[0];
        endTime = end.toTimeString().slice(0, 5);
      }
    }

    // Parse member from existing title
    const { member, cleanTitle } = parseMemberFromTitle(event.summary || "");

    setEditForm({
      summary: cleanTitle,
      selectedMember: member,
      description: event.description || "",
      location: event.location || "",
      startDate,
      startTime,
      endDate,
      endTime,
      allDay: isAllDay,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent) return;
    setIsSaving(true);

    try {
      // Format the title with family member if selected
      const finalSummary = formatTitleWithMember(editForm.summary, editForm.selectedMember);

      const eventData: {
        summary: string;
        description?: string;
        location?: string;
        start: { date?: string; dateTime?: string };
        end: { date?: string; dateTime?: string };
      } = {
        summary: finalSummary,
        description: editForm.description || undefined,
        location: editForm.location || undefined,
        start: {},
        end: {},
      };

      if (editForm.allDay) {
        eventData.start = { date: editForm.startDate };
        // Add 1 day to end for Google Calendar all-day events
        const endDate = new Date(editForm.endDate + "T00:00:00");
        endDate.setDate(endDate.getDate() + 1);
        eventData.end = { date: endDate.toISOString().split("T")[0] };
      } else {
        eventData.start = { dateTime: new Date(`${editForm.startDate}T${editForm.startTime}`).toISOString() };
        eventData.end = { dateTime: new Date(`${editForm.endDate}T${editForm.endTime}`).toISOString() };
      }

      const res = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        setIsEditing(false);
        setSelectedEvent(null);
        loadEvents();
      } else {
        console.error("Failed to update event");
      }
    } catch (err) {
      console.error("Failed to update event:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleting(false);
        setSelectedEvent(null);
        loadEvents();
      } else {
        console.error("Failed to delete event");
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatEventDateTime = (event: CalendarEvent) => {
    if (event.start.date) {
      // All-day event
      const startDate = new Date(event.start.date + "T00:00:00");
      const endDate = event.end.date ? new Date(event.end.date + "T00:00:00") : startDate;
      // Subtract 1 day from end since Google Calendar all-day events end on the next day
      endDate.setDate(endDate.getDate() - 1);

      if (startDate.getTime() === endDate.getTime()) {
        return startDate.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        });
      }
      return `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }

    if (event.start.dateTime) {
      const startTime = new Date(event.start.dateTime);
      const endTime = event.end.dateTime ? new Date(event.end.dateTime) : startTime;

      const dateStr = startTime.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
      });
      const startTimeStr = startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const endTimeStr = endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

      return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
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
        {/* Mobile: Navigation and date range */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={goToPreviousMobileWeek}
            className="p-2 min-h-[44px] min-w-[44px] hover:bg-gray-200 rounded transition flex items-center justify-center"
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
            onClick={goToNextMobileWeek}
            className="p-2 min-h-[44px] min-w-[44px] hover:bg-gray-200 rounded transition flex items-center justify-center"
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
          <span className="font-medium text-gray-900 text-sm">
            {mobileDays[0].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {mobileDays[5].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <button
            onClick={goToMobileToday}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 min-h-[44px] flex items-center"
          >
            {t("today")}
          </button>
        </div>

        {/* Desktop: Navigation and date range */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousTwoWeeks}
              className="p-2 min-h-[44px] min-w-[44px] hover:bg-gray-200 rounded transition flex items-center justify-center"
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
              className="p-2 min-h-[44px] min-w-[44px] hover:bg-gray-200 rounded transition flex items-center justify-center"
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
          <span className="font-medium text-gray-900">
            {firstWeekDays[0].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {secondWeekDays[6].toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-800 p-2 min-h-[44px] flex items-center"
          >
            {t("today")}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={startCreateMode}
            className="flex items-center justify-center gap-1 px-3 md:px-4 py-2.5 min-h-[44px] min-w-[44px] text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden md:inline">{t("addEvent")}</span>
          </button>
          <Link
            href="/calendar"
            className="text-sm text-gray-500 hover:text-gray-700 p-2 min-h-[44px] flex items-center whitespace-nowrap"
          >
            <span className="hidden md:inline">{t("viewFullCalendar") || "View Full Calendar"}</span>
            <span className="md:hidden">{t("more") || "More"}</span>
            {" "}&rarr;
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 px-4 py-2 bg-gray-50 border-b text-xs">
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

      {/* Mobile View: 6 days from today in a 3x2 grid */}
      <div className="md:hidden">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {mobileDays.slice(0, 3).map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const todayClass = isToday(day) ? "bg-blue-50" : "";
            const dayName = dayNames[day.getDay()];

            return (
              <div
                key={index}
                className={`min-h-[70px] ${todayClass}`}
              >
                {/* Day Header */}
                <div className="px-2 py-1 text-center border-b border-gray-100">
                  <div className="text-xs text-gray-500 uppercase">{dayName}</div>
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
                <div className="px-1 py-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => {
                    const eventColor = getEventColor(event.summary);
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs ${eventColor.color} px-1.5 py-1 min-h-[28px] rounded truncate hover:opacity-80 transition cursor-pointer`}
                        title={`${formatTime(event)} - ${event.summary}`}
                      >
                        {event.summary}
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-200">
          {mobileDays.slice(3, 6).map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const todayClass = isToday(day) ? "bg-blue-50" : "";
            const dayName = dayNames[day.getDay()];

            return (
              <div
                key={index}
                className={`min-h-[70px] ${todayClass}`}
              >
                {/* Day Header */}
                <div className="px-2 py-1 text-center border-b border-gray-100">
                  <div className="text-xs text-gray-500 uppercase">{dayName}</div>
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
                <div className="px-1 py-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => {
                    const eventColor = getEventColor(event.summary);
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs ${eventColor.color} px-1.5 py-1 min-h-[28px] rounded truncate hover:opacity-80 transition cursor-pointer`}
                        title={`${formatTime(event)} - ${event.summary}`}
                      >
                        {event.summary}
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop View: Full 2-week calendar */}
      <div className="hidden md:block">
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
                className={`min-h-[70px] ${todayClass}`}
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
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs ${eventColor.color} px-1.5 py-1 min-h-[28px] rounded truncate hover:opacity-80 transition cursor-pointer`}
                        title={`${formatTime(event)} - ${event.summary}`}
                      >
                        {event.summary}
                      </button>
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
                className={`min-h-[70px] ${todayClass}`}
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
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs ${eventColor.color} px-1.5 py-1 min-h-[28px] rounded truncate hover:opacity-80 transition cursor-pointer`}
                        title={`${formatTime(event)} - ${event.summary}`}
                      >
                        {event.summary}
                      </button>
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

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setSelectedEvent(null); setIsEditing(false); setIsDeleting(false); }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${getEventColor(selectedEvent.summary).dotColor}`}></span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? (t("editEvent") || "Edit Event") : selectedEvent.summary}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedEvent(null); setIsEditing(false); setIsDeleting(false); }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Delete Confirmation */}
            {isDeleting ? (
              <div className="p-4">
                <p className="text-sm text-gray-700 mb-4">{t("confirmDelete") || "Are you sure you want to delete this event?"}</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsDeleting(false)}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition disabled:opacity-50"
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                  >
                    {isSaving ? (t("deleting") || "Deleting...") : (t("delete") || "Delete")}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              /* Edit Form */
              <div className="p-4 space-y-4">
                {/* Family Member Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("assignTo") || "Assign to"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, selectedMember: "" })}
                      className={`px-3 py-1.5 text-sm rounded-full border transition ${
                        editForm.selectedMember === ""
                          ? "bg-blue-100 border-blue-500 text-blue-700"
                          : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {t("noAssignment") || "None"}
                    </button>
                    {FAMILY_MEMBERS.map((member) => (
                      <button
                        key={member.name}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, selectedMember: member.name })}
                        className={`px-3 py-1.5 text-sm rounded-full border transition ${
                          editForm.selectedMember === member.name
                            ? member.name === "Jasper"
                              ? "bg-purple-100 border-purple-500 text-purple-700"
                              : member.name === "Mingfei"
                              ? "bg-green-100 border-green-500 text-green-700"
                              : "bg-pink-100 border-pink-500 text-pink-700"
                            : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("eventTitle") || "Event Title"}
                  </label>
                  <input
                    type="text"
                    value={editForm.summary}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* All Day Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={editForm.allDay}
                    onChange={(e) => setEditForm({ ...editForm, allDay: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allDay" className="text-sm text-gray-700">
                    {t("allDayEvent") || "All day event"}
                  </label>
                </div>

                {/* Start Date/Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("startDate") || "Start Date"}
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {!editForm.allDay && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("startTime") || "Start Time"}
                      </label>
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* End Date/Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("endDate") || "End Date"}
                    </label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {!editForm.allDay && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("endTime") || "End Time"}
                      </label>
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("location") || "Location"}
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder={t("locationPlaceholder") || "Add a location"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("description") || "Description"}
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder={t("descriptionPlaceholder") || "Add event description"}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Edit Form Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition disabled:opacity-50"
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving || !editForm.summary || !editForm.startDate || !editForm.endDate}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                  >
                    {isSaving ? (t("saving") || "Saving...") : (t("save") || "Save")}
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                {/* Modal Body */}
                <div className="p-4 space-y-4">
                  {/* Date/Time */}
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-900">{formatEventDateTime(selectedEvent)}</p>
                      {selectedEvent.start.date && (
                        <p className="text-xs text-gray-500 mt-0.5">{t("allDay")}</p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {selectedEvent.location && (
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm text-gray-900">{selectedEvent.location}</p>
                    </div>
                  )}

                  {/* Description */}
                  {selectedEvent.description && (
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditMode(selectedEvent)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      {t("edit") || "Edit"}
                    </button>
                    <button
                      onClick={() => setIsDeleting(true)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      {t("delete") || "Delete"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedEvent.htmlLink && (
                      <a
                        href={selectedEvent.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
                      >
                        {t("openInGoogle") || "Open in Google Calendar"}
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                    >
                      {t("close") || "Close"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("addEvent")}
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Create Form */}
            <div className="p-4 space-y-4">
              {/* Family Member Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("assignTo")}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, selectedMember: "" })}
                    className={`px-3 py-1.5 text-sm rounded-full border transition ${
                      editForm.selectedMember === ""
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {t("noAssignment")}
                  </button>
                  {FAMILY_MEMBERS.map((member) => (
                    <button
                      key={member.name}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, selectedMember: member.name })}
                      className={`px-3 py-1.5 text-sm rounded-full border transition ${
                        editForm.selectedMember === member.name
                          ? member.name === "Jasper"
                            ? "bg-purple-100 border-purple-500 text-purple-700"
                            : member.name === "Mingfei"
                            ? "bg-green-100 border-green-500 text-green-700"
                            : "bg-pink-100 border-pink-500 text-pink-700"
                          : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("eventTitle")}
                </label>
                <input
                  type="text"
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  placeholder={t("eventTitlePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createAllDay"
                  checked={editForm.allDay}
                  onChange={(e) => setEditForm({ ...editForm, allDay: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="createAllDay" className="text-sm text-gray-700">
                  {t("allDayEvent")}
                </label>
              </div>

              {/* Start Date/Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("startDate")}
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {!editForm.allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("startTime")}
                    </label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* End Date/Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("endDate")}
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {!editForm.allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("endTime")}
                    </label>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("location")}
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder={t("locationPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("description")}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder={t("descriptionPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Create Form Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={isSaving || !editForm.summary || !editForm.startDate || !editForm.endDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {isSaving ? t("saving") : t("createEvent")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
