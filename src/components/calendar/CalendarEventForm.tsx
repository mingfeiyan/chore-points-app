"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

interface Props {
  event: CalendarEvent | null;
  selectedDate: Date;
  onClose: () => void;
  onSave: () => void;
}

// Helper to format date in local timezone as YYYY-MM-DD
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Family members for event assignment
const FAMILY_MEMBERS = ["Jasper", "Mingfei", "Yue"];

// Detect family member from event title and return member name and clean title
function parseMemberFromTitle(title: string): { member: string; cleanTitle: string } {
  const lowerTitle = title.toLowerCase();
  for (const member of FAMILY_MEMBERS) {
    const lowerMember = member.toLowerCase();
    // Check for patterns like "Jasper - Event" or "Jasper: Event" or "Jasper's Event"
    const patterns = [
      new RegExp(`^${lowerMember}\\s*[-:]\\s*`, "i"),
      new RegExp(`^${lowerMember}'s\\s+`, "i"),
    ];
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return { member, cleanTitle: title.replace(pattern, "") };
      }
    }
    // Also check if name appears anywhere in title
    if (lowerTitle.includes(lowerMember)) {
      return { member, cleanTitle: title };
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

// Generate time options in 5-minute increments
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const hour = String(h).padStart(2, '0');
      const minute = String(m).padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
}

// Round time to next half hour
function roundToNextHalfHour(date: Date): string {
  const minutes = date.getMinutes();
  const hours = date.getHours();

  let newMinutes: number;
  let newHours = hours;

  if (minutes === 0) {
    newMinutes = 0;
  } else if (minutes <= 30) {
    newMinutes = 30;
  } else {
    newMinutes = 0;
    newHours = (hours + 1) % 24;
  }

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// Convert time string to minutes for duration calculation
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to time string
function minutesToTime(totalMinutes: number): string {
  // Handle day overflow
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const TIME_OPTIONS = generateTimeOptions();

export default function CalendarEventForm({
  event,
  selectedDate,
  onClose,
  onSave,
}: Props) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");

  const [summary, setSummary] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(60); // Duration in minutes
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get the user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Round time to nearest 5 minutes
  const roundToNearest5 = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const roundedMinutes = Math.round(minutes / 5) * 5;
    if (roundedMinutes === 60) {
      return `${String((hours + 1) % 24).padStart(2, '0')}:00`;
    }
    return `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
  };

  // Initialize form with event data or defaults
  useEffect(() => {
    if (event) {
      // Parse member from existing title
      const { member, cleanTitle } = parseMemberFromTitle(event.summary);
      setSummary(cleanTitle);
      setSelectedMember(member);
      setDescription(event.description || "");
      setLocation(event.location || "");

      if (event.start.date) {
        setAllDay(true);
        setStartDate(event.start.date);
        setEndDate(event.end.date || event.start.date);
      } else if (event.start.dateTime) {
        setAllDay(false);
        const start = new Date(event.start.dateTime);
        const startTimeRaw = start.toTimeString().slice(0, 5);
        const startTimeRounded = roundToNearest5(startTimeRaw);
        setStartDate(toLocalDateString(start));
        setStartTime(startTimeRounded);

        if (event.end.dateTime) {
          const end = new Date(event.end.dateTime);
          const endTimeRaw = end.toTimeString().slice(0, 5);
          const endTimeRounded = roundToNearest5(endTimeRaw);
          setEndDate(toLocalDateString(end));
          setEndTime(endTimeRounded);
          // Calculate duration
          const startMinutes = timeToMinutes(startTimeRounded);
          const endMinutes = timeToMinutes(endTimeRounded);
          const calcDuration = endMinutes - startMinutes + (toLocalDateString(end) !== toLocalDateString(start) ? 1440 : 0);
          setDuration(calcDuration > 0 ? calcDuration : 60);
        }
      }
    } else {
      // Default to selected date with start time rounded to next half hour
      const dateStr = toLocalDateString(selectedDate);
      const now = new Date();
      const defaultStartTime = roundToNextHalfHour(now);
      const defaultEndTime = minutesToTime(timeToMinutes(defaultStartTime) + 60);

      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      setDuration(60);
      setSelectedMember("");
    }
  }, [event, selectedDate]);

  // Handle start date change - update end date to maintain the same day gap
  const handleStartDateChange = (newStartDate: string) => {
    // Guard against empty dates
    if (!startDate || !endDate) {
      setStartDate(newStartDate);
      setEndDate(newStartDate);
      return;
    }

    // Calculate the day gap between current start and end dates
    // Use T12:00:00 to avoid timezone edge cases
    const currentStart = new Date(startDate + "T12:00:00");
    const currentEnd = new Date(endDate + "T12:00:00");
    const dayGap = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));

    // Apply the same day gap to the new start date
    const newStart = new Date(newStartDate + "T12:00:00");
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + dayGap);

    setStartDate(newStartDate);
    setEndDate(toLocalDateString(newEnd));
  };

  // Handle start time change - update end time to maintain duration
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    const newEndMinutes = timeToMinutes(newStartTime) + duration;
    const newEndTime = minutesToTime(newEndMinutes);
    setEndTime(newEndTime);
    // If end time wraps to next day, update end date
    if (newEndMinutes >= 1440) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setEndDate(toLocalDateString(nextDay));
    } else {
      setEndDate(startDate);
    }
  };

  // Handle end time change - update duration
  const handleEndTimeChange = (newEndTime: string) => {
    setEndTime(newEndTime);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(newEndTime);
    let newDuration = endMinutes - startMinutes;
    // Handle if end time is on next day
    if (endDate > startDate || newDuration < 0) {
      newDuration += 1440;
    }
    setDuration(newDuration > 0 ? newDuration : 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Format the title with family member if selected, default to "Untitled" if empty
      const titleToUse = summary.trim() || "Untitled";
      const finalSummary = formatTitleWithMember(titleToUse, selectedMember);

      const eventData = {
        summary: finalSummary,
        description: description || undefined,
        location: location || undefined,
        allDay,
        startDate: allDay
          ? startDate
          : `${startDate}T${startTime}:00`,
        endDate: allDay
          ? endDate
          : `${endDate}T${endTime}:00`,
        timeZone: userTimezone,
      };

      const url = event
        ? `/api/calendar/events/${event.id}`
        : "/api/calendar/events";

      const res = await fetch(url, {
        method: event ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToSaveEvent"));
      }
    } catch (err) {
      console.error("Failed to save event:", err);
      setError(t("failedToSaveEvent"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {event ? t("editEvent") : t("addEvent")}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-4 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Family Member Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("assignTo")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedMember("")}
                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                  selectedMember === ""
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {t("noAssignment")}
              </button>
              {FAMILY_MEMBERS.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition ${
                    selectedMember === member
                      ? member === "Jasper"
                        ? "bg-purple-100 border-purple-500 text-purple-700"
                        : member === "Mingfei"
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-pink-100 border-pink-500 text-pink-700"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {member}
                </button>
              ))}
            </div>
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("eventTitle")}
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Untitled"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">
              {t("allDayEvent")}
            </label>
          </div>

          {/* Timezone indicator */}
          {!allDay && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t("timezone")}: {userTimezone}</span>
            </div>
          )}

          {/* Start Date/Time */}
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("startDate")} *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("startTime")} *
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("endDate")} *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("endTime")} *
                </label>
                <select
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("locationPlaceholder")}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          </div>

          {/* Buttons - Fixed at bottom */}
          <div className="flex justify-end gap-3 p-4 bg-gray-50 flex-shrink-0 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !startDate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? tCommon("saving")
                : event
                ? tCommon("save")
                : t("createEvent")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
