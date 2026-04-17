import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyKioskToken } from "../verify/route";

// Extract first emoji from a string
function extractEmoji(text: string): string | null {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  const matches = text.match(emojiRegex);
  return matches?.[0] ?? null;
}

// Get start of today in PT timezone (America/Los_Angeles) as UTC Date
function getTodayStartPT(): Date {
  const now = new Date();
  // Format today's date string in PT
  const ptDateStr = now.toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  }); // "YYYY-MM-DD"
  // Parse as midnight PT — convert to UTC
  const midnightPT = new Date(`${ptDateStr}T00:00:00-08:00`);
  // Use actual PT offset (handles DST)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const localMidnight = new Date(
    `${p.year}-${p.month}-${p.day}T00:00:00`
  );
  // localMidnight is a "local time" but stored as UTC — adjust with actual offset
  const offsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getTime();
  return new Date(localMidnight.getTime() + offsetMs);
}

// Get start of this week (Monday) in PT timezone as UTC Date
function getWeekStartPT(): Date {
  const now = new Date();
  const ptNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const day = ptNow.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayPT = new Date(ptNow);
  mondayPT.setDate(ptNow.getDate() + diffToMonday);
  mondayPT.setHours(0, 0, 0, 0);
  // Adjust back to UTC
  const offsetMs = now.getTime() - ptNow.getTime();
  return new Date(mondayPT.getTime() + offsetMs);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
) {
  const { kidId } = await params;

  // Verify kiosk token
  const token = _req.nextUrl.searchParams.get("token") || _req.headers.get("x-kiosk-token") || "";
  if (!verifyKioskToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up the kid
  const kid = await prisma.user.findUnique({
    where: { id: kidId, role: "KID" },
    select: { id: true, name: true, familyId: true },
  });

  if (!kid || !kid.familyId) {
    return NextResponse.json({ error: "Kid not found" }, { status: 404 });
  }

  // Get all active scheduled chores for the family
  const chores = await prisma.chore.findMany({
    where: {
      familyId: kid.familyId,
      isActive: true,
      schedule: { not: null },
    },
    select: { id: true, title: true, defaultPoints: true, schedule: true },
    orderBy: { createdAt: "asc" },
  });

  // Get today's and this week's point entries for the kid (for completion checks)
  const weekStart = getWeekStartPT();
  const todayStart = getTodayStartPT();

  const recentEntries = await prisma.pointEntry.findMany({
    where: {
      kidId,
      choreId: { not: null },
      date: { gte: weekStart },
    },
    select: { choreId: true, date: true },
  });

  // Build sets for fast lookup
  const completedTodayChoreIds = new Set<string>();
  const completedThisWeekChoreIds = new Set<string>();
  for (const entry of recentEntries) {
    if (entry.choreId) {
      completedThisWeekChoreIds.add(entry.choreId);
      if (entry.date >= todayStart) {
        completedTodayChoreIds.add(entry.choreId);
      }
    }
  }

  // Total points for the kid
  const totalPointsResult = await prisma.pointEntry.aggregate({
    where: { kidId },
    _sum: { points: true },
  });
  const totalPoints = totalPointsResult._sum.points ?? 0;

  // Latest point entry for animation detection
  const latestEntry = await prisma.pointEntry.findFirst({
    where: { kidId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      points: true,
      date: true,
      note: true,
      chore: { select: { title: true } },
    },
  });

  // Build chores grouped by schedule
  type ChoreItem = {
    id: string;
    title: string;
    emoji: string | null;
    defaultPoints: number;
    completedToday?: boolean;
    completedThisWeek?: boolean;
  };

  const morning: ChoreItem[] = [];
  const evening: ChoreItem[] = [];
  const weekly: ChoreItem[] = [];

  for (const chore of chores) {
    const emoji = extractEmoji(chore.title);
    const base = { id: chore.id, title: chore.title, emoji, defaultPoints: chore.defaultPoints };
    if (chore.schedule === "morning") {
      morning.push({ ...base, completedToday: completedTodayChoreIds.has(chore.id) });
    } else if (chore.schedule === "evening") {
      evening.push({ ...base, completedToday: completedTodayChoreIds.has(chore.id) });
    } else if (chore.schedule === "weekly") {
      weekly.push({ ...base, completedThisWeek: completedThisWeekChoreIds.has(chore.id) });
    }
  }

  return NextResponse.json({
    kid: { id: kid.id, name: kid.name },
    totalPoints,
    chores: { morning, evening, weekly },
    latestEntry: latestEntry
      ? {
          id: latestEntry.id,
          points: latestEntry.points,
          choreTitle: latestEntry.chore?.title ?? null,
          note: latestEntry.note,
          date: latestEntry.date,
        }
      : null,
  });
}
