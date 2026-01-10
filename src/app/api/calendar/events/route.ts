import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import {
  getValidAccessToken,
  listEvents,
  createEvent,
} from "@/lib/google-calendar";

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

    if (!settings?.isConnected || !settings.selectedCalendarId) {
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

    // Get access token
    const accessToken = await getValidAccessToken(session.user.id);

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

    if (!settings?.isConnected || !settings.selectedCalendarId) {
      return NextResponse.json(
        { error: "No calendar connected" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { summary, description, location, start, end } = body;

    if (!summary || !start) {
      return NextResponse.json(
        { error: "Summary and start are required" },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getValidAccessToken(session.user.id);

    // Build event object - frontend sends start/end in Google Calendar format
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
    if (start.date) {
      eventData.start = { date: start.date };
      eventData.end = { date: end?.date || start.date };
    } else if (start.dateTime) {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      eventData.start = { dateTime: start.dateTime, timeZone };
      eventData.end = { dateTime: end?.dateTime || start.dateTime, timeZone };
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
