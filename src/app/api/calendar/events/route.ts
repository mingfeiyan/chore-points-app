import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import {
  getValidAccessToken,
  listEvents,
  createEvent,
} from "@/lib/google-calendar";

// Convert a local datetime string (e.g., "2025-01-15T09:00:00") to ISO format with offset
function toISOWithOffset(localDateTimeStr: string, timeZone: string): string {
  const [datePart, timePart] = localDateTimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);

  const date = new Date(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");

  let offset = "+00:00";
  if (offsetPart?.value) {
    const match = offsetPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (match) {
      const sign = match[1];
      const hours = match[2].padStart(2, "0");
      const minutes = match[3] || "00";
      offset = `${sign}${hours}:${minutes}`;
    }
  }

  return `${localDateTimeStr}${offset}`;
}

// GET /api/calendar/events - List events from connected calendar
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    if (!session.user.familyId) {
      return NextResponse.json({ error: "No family" }, { status: 403 });
    }

    // Get calendar settings
    const settings = await prisma.calendarSettings.findUnique({
      where: { familyId: session.user.familyId },
    });

    if (!settings?.isConnected || !settings.selectedCalendarId || !settings.connectedByUserId) {
      return NextResponse.json(
        { error: "No calendar connected" },
        { status: 400 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax");
    const maxResults = parseInt(searchParams.get("maxResults") || "50");

    // Get access token from the user who connected the calendar (not current user)
    // This allows other family parents to view the calendar without Google OAuth
    const accessToken = await getValidAccessToken(settings.connectedByUserId);

    // Fetch events
    const events = await listEvents(accessToken, settings.selectedCalendarId, {
      timeMin,
      timeMax: timeMax || undefined,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({
      events,
      calendarName: settings.selectedCalendarName,
    });
  } catch (error) {
    console.error("Error listing events:", error);
    const message = error instanceof Error ? error.message : "Failed to list events";

    // Check if it's a token error (account missing, no refresh token, or token revoked/expired)
    if (
      message.includes("No Google account") ||
      message.includes("refresh token") ||
      message.includes("Failed to refresh token") ||
      message.includes("invalid_grant")
    ) {
      return NextResponse.json(
        { error: "Google calendar access has expired. Please reconnect the calendar." },
        { status: 401 }
      );
    }

    // Check if it's a scope/permission error
    if (
      message.includes("insufficientPermissions") ||
      message.includes("PERMISSION_DENIED") ||
      message.includes("insufficient authentication scopes")
    ) {
      return NextResponse.json(
        { error: "Calendar permissions are missing. Please reconnect with Google Calendar access." },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/calendar/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    if (!session.user.familyId) {
      return NextResponse.json({ error: "No family" }, { status: 403 });
    }

    // Get calendar settings
    const settings = await prisma.calendarSettings.findUnique({
      where: { familyId: session.user.familyId },
    });

    if (!settings?.isConnected || !settings.selectedCalendarId || !settings.connectedByUserId) {
      return NextResponse.json(
        { error: "No calendar connected" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { summary, description, location, startDate, endDate, allDay, timeZone } = body;

    if (!summary || !startDate) {
      return NextResponse.json(
        { error: "Summary and start are required" },
        { status: 400 }
      );
    }

    // Get access token from the user who connected the calendar
    const accessToken = await getValidAccessToken(settings.connectedByUserId);

    // Build event object
    const eventData: {
      summary: string;
      description?: string;
      location?: string;
      start: { date?: string; dateTime?: string; timeZone?: string };
      end: { date?: string; dateTime?: string; timeZone?: string };
    } = {
      summary,
      description,
      location,
      start: {},
      end: {},
    };

    // Handle all-day events (date) vs timed events (dateTime)
    if (allDay) {
      eventData.start = { date: startDate.split("T")[0] };
      eventData.end = { date: (endDate || startDate).split("T")[0] };
    } else {
      const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      eventData.start = { dateTime: toISOWithOffset(startDate, tz), timeZone: tz };
      eventData.end = { dateTime: toISOWithOffset(endDate || startDate, tz), timeZone: tz };
    }

    const event = await createEvent(
      accessToken,
      settings.selectedCalendarId,
      eventData
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error creating event:", error);
    const message = error instanceof Error ? error.message : "Failed to create event";

    // Check if it's a token error (account missing, no refresh token, or token revoked/expired)
    if (
      message.includes("No Google account") ||
      message.includes("refresh token") ||
      message.includes("Failed to refresh token") ||
      message.includes("invalid_grant")
    ) {
      return NextResponse.json(
        { error: "Google calendar access has expired. Please reconnect the calendar." },
        { status: 401 }
      );
    }

    // Check if it's a scope/permission error
    if (
      message.includes("insufficientPermissions") ||
      message.includes("PERMISSION_DENIED") ||
      message.includes("insufficient authentication scopes")
    ) {
      return NextResponse.json(
        { error: "Calendar permissions are missing. Please reconnect with Google Calendar access." },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
