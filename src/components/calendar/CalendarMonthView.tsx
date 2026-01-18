"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

// Helper to format date in local timezone as YYYY-MM-DD
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Family member color mapping
const FAMILY_MEMBERS = [
  { name: "Jasper", color: "bg-purple-100 text-purple-800", dotColor: "bg-purple-500" },
  { name: "Mingfei", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  { name: "Yue", color: "bg-pink-100 text-pink-800", dotColor: "bg-pink-500" },
];

const DEFAULT_COLOR = { color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" };

function formatEventTime(event: CalendarEvent, currentDateStr: string): string | null {
  if (event.start.date) return null; // All-day event, no time
  if (event.start.dateTime) {
    const startTime = new Date(event.start.dateTime);
    // Only show time on the first day of multi-day events
    const eventStartDate = toLocalDateString(startTime);
    if (eventStartDate !== currentDateStr) return null;

    return startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return null;
}

function getEventColor(summary: string): { color: string; dotColor: string; member: string | null } {
  const lowerSummary = summary.toLowerCase();
  for (const member of FAMILY_MEMBERS) {
    if (lowerSummary.includes(member.name.toLowerCase())) {
      return { ...member, member: member.name };
    }
  }
  return { ...DEFAULT_COLOR, member: null };
}

interface Props {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  loading: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
}

export default function CalendarMonthView({
  selectedDate,
  onDateChange,
  events,
  loading,
  onEventClick,
  onEventDelete,
}: Props) {
  const t = useTranslations("calendar");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const { days, firstDayOfWeek } = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return { days, firstDayOfWeek };
  }, [selectedDate]);

  // Helper to generate all dates between start and end (inclusive)
  const getDatesBetween = (startStr: string, endStr: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");

    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Group events by date (including multi-day events on all their dates)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      // Use local timezone for dateTime events to avoid UTC date shift
      const startStr = event.start.date || (event.start.dateTime ? toLocalDateString(new Date(event.start.dateTime)) : undefined);
      const endStr = event.end.date || (event.end.dateTime ? toLocalDateString(new Date(event.end.dateTime)) : undefined);

      if (startStr && endStr) {
        // For all-day events, Google Calendar end date is exclusive (day after last day)
        // So we need to subtract 1 day from the end date
        let adjustedEndStr = endStr;
        if (event.start.date && event.end.date) {
          const endDate = new Date(endStr + "T00:00:00");
          endDate.setDate(endDate.getDate() - 1);
          const year = endDate.getFullYear();
          const month = String(endDate.getMonth() + 1).padStart(2, "0");
          const day = String(endDate.getDate()).padStart(2, "0");
          adjustedEndStr = `${year}-${month}-${day}`;
        }

        const dates = getDatesBetween(startStr, adjustedEndStr);
        dates.forEach((dateStr) => {
          if (!map[dateStr]) map[dateStr] = [];
          map[dateStr].push(event);
        });
      } else if (startStr) {
        // Fallback for events with only start date
        if (!map[startStr]) map[startStr] = [];
        map[startStr].push(event);
      }
    });
    return map;
  }, [events]);

  const goToPreviousMonth = () => {
    onDateChange(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    onDateChange(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return eventsByDate[dateStr] || [];
  };

  const formatEventDateTime = (event: CalendarEvent) => {
    if (event.start.date) {
      const startDate = new Date(event.start.date + "T00:00:00");
      const endDate = event.end.date ? new Date(event.end.date + "T00:00:00") : startDate;
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

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const handleEdit = () => {
    if (selectedEvent && onEventClick) {
      onEventClick(selectedEvent);
      setSelectedEvent(null);
    }
  };

  const handleDelete = () => {
    if (selectedEvent && onEventDelete) {
      onEventDelete(selectedEvent.id);
      setSelectedEvent(null);
      setIsDeleting(false);
    }
  };

  const weekDays = [
    t("sun"),
    t("mon"),
    t("tue"),
    t("wed"),
    t("thu"),
    t("fri"),
    t("sat"),
  ];

  const monthNames = [
    t("january"),
    t("february"),
    t("march"),
    t("april"),
    t("may"),
    t("june"),
    t("july"),
    t("august"),
    t("september"),
    t("october"),
    t("november"),
    t("december"),
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
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

        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t("today")}
          </button>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
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

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before the first of the month */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-100 bg-gray-50"
          />
        ))}

        {/* Days of the month */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const dateStr = `${selectedDate.getFullYear()}-${String(
            selectedDate.getMonth() + 1
          ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

          return (
            <div
              key={day}
              className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-100 p-1 ${
                isToday(day) ? "bg-blue-50" : ""
              }`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday(day)
                    ? "w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full"
                    : "text-gray-700"
                }`}
              >
                {day}
              </div>
              {hasEvents && (
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const eventColor = getEventColor(event.summary);
                    const eventTime = formatEventTime(event, dateStr);
                    return (
                      <button
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className={`w-full text-xs ${eventColor.color} px-1 py-0.5 rounded hover:opacity-80 transition cursor-pointer`}
                        title={event.summary}
                      >
                        <div className="truncate text-left">{event.summary}</div>
                        {eventTime && (
                          <div className="text-[10px] opacity-75 mt-0.5 text-left">{eventTime}</div>
                        )}
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                        setSelectedDayEvents({ date: dayDate, events: dayEvents });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      +{dayEvents.length - 3} {t("more")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setSelectedEvent(null); setIsDeleting(false); }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto overflow-x-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${getEventColor(selectedEvent.summary).dotColor}`}></span>
                <h3 className="text-lg font-semibold text-gray-900 break-words">{selectedEvent.summary}</h3>
              </div>
              <button
                onClick={() => { setSelectedEvent(null); setIsDeleting(false); }}
                className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                  >
                    {t("delete") || "Delete"}
                  </button>
                </div>
              </div>
            ) : (
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
                    <div className="flex items-start gap-3 min-w-0">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm text-gray-900 break-words min-w-0">{selectedEvent.location}</p>
                    </div>
                  )}

                  {/* Description */}
                  {selectedEvent.description && (
                    <div className="flex items-start gap-3 min-w-0">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words min-w-0">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="flex gap-2">
                    <button
                      onClick={handleEdit}
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

      {/* Day Events Modal - Shows all events for a day */}
      {selectedDayEvents && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDayEvents.date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Events List */}
            <div className="overflow-auto flex-1 p-4 space-y-2">
              {selectedDayEvents.events.map((event) => {
                const eventColor = getEventColor(event.summary);
                const dateStr = toLocalDateString(selectedDayEvents.date);
                const eventTime = formatEventTime(event, dateStr);
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(event);
                    }}
                    className={`w-full text-left ${eventColor.color} px-3 py-2 rounded-lg hover:opacity-80 transition cursor-pointer`}
                  >
                    <div className="font-medium text-sm">{event.summary}</div>
                    {eventTime && (
                      <div className="text-xs opacity-75 mt-0.5">{eventTime}</div>
                    )}
                    {event.start.date && (
                      <div className="text-xs opacity-75 mt-0.5">{t("allDay")}</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
              >
                {t("close") || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
