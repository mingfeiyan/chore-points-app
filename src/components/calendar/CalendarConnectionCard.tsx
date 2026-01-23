"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

interface CalendarSettings {
  id: string;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
  isConnected: boolean;
}

interface Props {
  onConnect: (settings: CalendarSettings) => void;
  settings: CalendarSettings | null;
}

export default function CalendarConnectionCard({ onConnect }: Props) {
  const t = useTranslations("calendar");
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [error, setError] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);

  // Load available calendars
  useEffect(() => {
    async function loadCalendars() {
      setLoadingCalendars(true);
      setError("");
      setNeedsReauth(false);
      try {
        const res = await fetch("/api/calendar/calendars");
        const data = await res.json();

        if (res.ok) {
          setCalendars(data.calendars || []);
          // Auto-select primary calendar if available
          const primary = data.calendars?.find((c: Calendar) => c.primary);
          if (primary) {
            setSelectedCalendarId(primary.id);
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token expired/revoked or insufficient scopes - need to re-authenticate with Google
          setNeedsReauth(true);
          setError(data.error || t("failedToLoadCalendars"));
        } else {
          setError(data.error || t("failedToLoadCalendars"));
        }
      } catch (err) {
        console.error("Failed to load calendars:", err);
        setError(t("failedToLoadCalendars"));
      } finally {
        setLoadingCalendars(false);
      }
    }
    loadCalendars();
  }, [t]);

  const handleConnect = async () => {
    if (!selectedCalendarId) return;

    setLoading(true);
    setError("");

    try {
      const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);

      const res = await fetch("/api/calendar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCalendarId,
          selectedCalendarName: selectedCalendar?.summary,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onConnect(data.settings);
      } else {
        setError(data.error || t("failedToConnect"));
      }
    } catch (err) {
      console.error("Failed to connect calendar:", err);
      setError(t("failedToConnect"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t("connectCalendar")}
        </h3>
        <p className="text-sm text-gray-500">{t("connectDescription")}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loadingCalendars ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : needsReauth ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-4">
            {t("googleAccessExpired") || "Your Google Calendar access has expired."}
          </p>
          <p className="text-gray-400 text-xs mb-4">
            {t("revokeAccessHint") || "If the button below doesn't work, please revoke access at"}
            {" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google Account Settings
            </a>
            {" "}
            {t("thenTryAgain") || "and try again."}
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/calendar" })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("connectGoogleCalendar") || "Connect Google Calendar"}
          </button>
        </div>
      ) : calendars.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-4">{t("noCalendarsFound")}</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/calendar" })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("signInWithGoogle")}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectCalendar")}
            </label>
            <select
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t("chooseCalendar")}</option>
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? ` (${t("primary")})` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleConnect}
            disabled={!selectedCalendarId || loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("connecting") : t("connect")}
          </button>
        </>
      )}
    </div>
  );
}
