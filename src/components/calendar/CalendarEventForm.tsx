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
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        setStartDate(start.toISOString().split("T")[0]);
        setStartTime(start.toTimeString().slice(0, 5));

        if (event.end.dateTime) {
          const end = new Date(event.end.dateTime);
          setEndDate(end.toISOString().split("T")[0]);
          setEndTime(end.toTimeString().slice(0, 5));
        }
      }
    } else {
      // Default to selected date
      const dateStr = selectedDate.toISOString().split("T")[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime("09:00");
      setEndTime("10:00");
      setSelectedMember("");
    }
  }, [event, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Format the title with family member if selected
      const finalSummary = formatTitleWithMember(summary, selectedMember);

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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b">
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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              {t("eventTitle")} *
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("eventTitlePlaceholder")}
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

          {/* Start Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("startDate")} *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("startTime")} *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("endDate")} *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("endTime")} *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !summary || !startDate}
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
