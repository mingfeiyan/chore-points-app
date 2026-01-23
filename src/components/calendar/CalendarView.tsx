"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import CalendarConnectionCard from "./CalendarConnectionCard";
import CalendarMonthView from "./CalendarMonthView";
import CalendarEventForm from "./CalendarEventForm";

interface CalendarSettings {
  id: string;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
  isConnected: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

export default function CalendarView() {
  const t = useTranslations("calendar");
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Load calendar settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/calendar/settings");
        const data = await res.json();
        setSettings(data.settings);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Load events when calendar is connected
  const loadEvents = useCallback(async () => {
    if (!settings?.isConnected) return;

    setEventsLoading(true);
    try {
      // Get events for the current month
      const startOfMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const res = await fetch(
        `/api/calendar/events?timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}`
      );
      const data = await res.json();

      if (res.ok) {
        setEvents(data.events || []);
      } else if (res.status === 401 || res.status === 403) {
        // Token expired/revoked - need to reconnect
        setSettings((prev) => prev ? { ...prev, isConnected: false } : null);
        setEvents([]);
      } else {
        setError(data.error || t("failedToLoadEvents"));
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setError(t("failedToLoadEvents"));
    } finally {
      setEventsLoading(false);
    }
  }, [settings?.isConnected, selectedDate, t]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSettingsUpdate = (newSettings: CalendarSettings) => {
    setSettings(newSettings);
  };

  const handleDisconnect = () => {
    setSettings(null);
    setEvents([]);
  };

  const handleEventCreated = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    loadEvents();
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadEvents();
      } else if (res.status === 401 || res.status === 403) {
        // Token expired/revoked - need to reconnect
        setSettings((prev) => prev ? { ...prev, isConnected: false } : null);
        setEvents([]);
      } else {
        const data = await res.json();
        setError(data.error || t("failedToDeleteEvent"));
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
      setError(t("failedToDeleteEvent"));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show connection card if not connected
  if (!settings?.isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
          <p className="text-gray-500 mt-1">{t("pageDesc")}</p>
        </div>
        <CalendarConnectionCard
          onConnect={handleSettingsUpdate}
          settings={settings}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
          <p className="text-gray-500 mt-1">{t("pageDesc")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowEventForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            + {t("addEvent")}
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            {t("disconnect")}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            &times;
          </button>
        </div>
      )}

      {/* Month view */}
      <CalendarMonthView
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        events={events}
        loading={eventsLoading}
        onEventClick={handleEditEvent}
        onEventDelete={handleDeleteEvent}
      />

      {/* Event form modal */}
      {showEventForm && (
        <CalendarEventForm
          event={editingEvent}
          selectedDate={selectedDate}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
          onSave={handleEventCreated}
        />
      )}
    </div>
  );
}
