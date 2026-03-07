import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyKioskToken } from "../verify/route";
import { getTodayStartPT, getWeekStartPT, buildBonusNote } from "@/lib/date-utils";

// Extract first emoji from a string
function extractEmoji(text: string): string | null {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  const matches = text.match(emojiRegex);
  return matches?.[0] ?? null;
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

  // Category completion bonus status
  const bonuses: Record<string, { total: number; completed: number; bonusAwarded: boolean }> = {};
  const scheduleGroups = { morning, evening, weekly };

  for (const [schedule, items] of Object.entries(scheduleGroups)) {
    const total = items.length;
    const isWeekly = schedule === "weekly";
    const completed = items.filter((c) =>
      isWeekly ? c.completedThisWeek : c.completedToday
    ).length;

    // Check if bonus was already awarded for this period
    const periodStart = schedule === "weekly" ? weekStart : todayStart;
    const bonusNote = buildBonusNote(schedule);
    const existingBonus = await prisma.pointEntry.findFirst({
      where: {
        kidId,
        choreId: null,
        date: { gte: periodStart },
        note: { contains: "全勤奖" },
        points: 5,
      },
    });

    // Only count as bonus for this specific schedule
    const bonusAwarded = existingBonus?.note?.includes(bonusNote) ?? false;

    bonuses[schedule] = { total, completed, bonusAwarded };
  }

  return NextResponse.json({
    kid: { id: kid.id, name: kid.name },
    totalPoints,
    chores: { morning, evening, weekly },
    bonuses,
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
