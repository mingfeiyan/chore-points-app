import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import {
  getValidAccessToken,
  getEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/google-calendar";

// Convert a local datetime string (e.g., "2025-01-15T09:00:00") to ISO format with offset
function toISOWithOffset(localDateTimeStr: string, timeZone: string): string {
  // Parse the local datetime components
  const [datePart, timePart] = localDateTimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);

  // Create a date in the specified timezone and get the offset
  const date = new Date(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");

  // Parse offset like "GMT-8" or "GMT+5:30" to "-08:00" or "+05:30"
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

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

// GET /api/calendar/events/[eventId] - Get a single event
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
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

    const settings = await prisma.calendarSettings.findUnique({
      where: { familyId: session.user.familyId },
    });

    if (!settings?.isConnected || !settings.selectedCalendarId || !settings.connectedByUserId) {
      return NextResponse.json(
        { error: "No calendar connected" },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(settings.connectedByUserId);
    const event = await getEvent(
      accessToken,
      settings.selectedCalendarId,
      eventId
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error getting event:", error);
    const message = error instanceof Error ? error.message : "Failed to get event";

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

// PUT /api/calendar/events/[eventId] - Update an event
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
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
    const { summary, description, startDate, endDate, allDay, location, timeZone, start, end } = body;

    const accessToken = await getValidAccessToken(settings.connectedByUserId);

    // Use client-provided timezone, or fall back to server timezone
    const eventTimeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    let eventData: Record<string, unknown>;

    // Handle two different payload formats:
    // 1. CalendarEventForm sends: { startDate, endDate, allDay, timeZone }
    // 2. WeeklyCalendarView sends: { start: {dateTime/date}, end: {dateTime/date} }
    if (start || end) {
      // WeeklyCalendarView format - pass through start/end objects directly
      eventData = {
        summary,
        description,
        location,
        start,
        end,
      };
    } else if (allDay) {
      // CalendarEventForm all-day format
      eventData = {
        summary,
        description,
        location,
        start: startDate ? { date: startDate.split("T")[0] } : undefined,
        end: endDate ? { date: endDate.split("T")[0] } : undefined,
      };
    } else {
      // CalendarEventForm timed event format
      eventData = {
        summary,
        description,
        location,
        start: startDate
          ? { dateTime: toISOWithOffset(startDate, eventTimeZone), timeZone: eventTimeZone }
          : undefined,
        end: endDate
          ? { dateTime: toISOWithOffset(endDate, eventTimeZone), timeZone: eventTimeZone }
          : undefined,
      };
    }

    // Remove undefined values
    const cleanEventData = Object.fromEntries(
      Object.entries(eventData).filter(([, v]) => v !== undefined)
    );

    const event = await updateEvent(
      accessToken,
      settings.selectedCalendarId,
      eventId,
      cleanEventData
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error updating event:", error);
    const message = error instanceof Error ? error.message : "Failed to update event";

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

// DELETE /api/calendar/events/[eventId] - Delete an event
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
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

    const settings = await prisma.calendarSettings.findUnique({
      where: { familyId: session.user.familyId },
    });

    if (!settings?.isConnected || !settings.selectedCalendarId || !settings.connectedByUserId) {
      return NextResponse.json(
        { error: "No calendar connected" },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(settings.connectedByUserId);
    await deleteEvent(accessToken, settings.selectedCalendarId, eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    const message = error instanceof Error ? error.message : "Failed to delete event";

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
