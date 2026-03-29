import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyKioskToken } from "../verify/route";
import { getTodayStartPT, getWeekStartPT, buildBonusNote, getBaseSchedule, isChoreActiveToday, getTodayStringPT, isSchoolDayBasic } from "@/lib/date-utils";

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

  // Check if today is a custom off-day (school breaks, family holidays)
  const todayStr = getTodayStringPT();
  const customOffDay = await prisma.schoolOff.findFirst({
    where: {
      familyId: kid.familyId,
      date: new Date(todayStr + "T00:00:00"),
    },
  });
  // School day = basic check (weekday + not federal holiday) AND not a custom off-day
  const isSchoolDay = isSchoolDayBasic() && !customOffDay;

  // Get all active scheduled chores for the family
  const chores = await prisma.chore.findMany({
    where: {
      familyId: kid.familyId,
      isActive: true,
      schedule: { not: null },
    },
    select: { id: true, title: true, icon: true, defaultPoints: true, schedule: true },
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

  // Lifetime stats
  const kidStats = await prisma.kidStats.findUnique({
    where: { kidId },
    select: { totalEarned: true, totalSpent: true },
  });

  // Latest point entry for animation detection (use createdAt, not date — some entries like redemptions may have future dates)
  const latestEntry = await prisma.pointEntry.findFirst({
    where: { kidId },
    orderBy: { createdAt: "desc" },
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
    weekdayOnly?: boolean;
    activeToday?: boolean;
  };

  const morning: ChoreItem[] = [];
  const evening: ChoreItem[] = [];
  const weekly: ChoreItem[] = [];

  for (const chore of chores) {
    if (!chore.schedule) continue;

    const emoji = chore.icon || extractEmoji(chore.title);
    const baseSchedule = getBaseSchedule(chore.schedule);
    const weekdayOnly = chore.schedule.endsWith("_weekday");
    const activeToday = weekdayOnly ? isSchoolDay : true;
    const base = { id: chore.id, title: chore.title, emoji, defaultPoints: chore.defaultPoints, weekdayOnly, activeToday };
    if (baseSchedule === "morning") {
      morning.push({ ...base, completedToday: completedTodayChoreIds.has(chore.id) });
    } else if (baseSchedule === "evening") {
      evening.push({ ...base, completedToday: completedTodayChoreIds.has(chore.id) });
    } else if (baseSchedule === "weekly") {
      weekly.push({ ...base, completedThisWeek: completedThisWeekChoreIds.has(chore.id) });
    }
  }

  // Category completion bonus status
  const bonuses: Record<string, { total: number; completed: number; bonusAwarded: boolean }> = {};
  const scheduleGroups = { morning, evening, weekly };

  for (const [schedule, items] of Object.entries(scheduleGroups)) {
    // Only count chores active today toward the bonus
    const activeItems = items.filter((c) => c.activeToday !== false);
    const total = activeItems.length;
    const isWeekly = schedule === "weekly";
    const completed = activeItems.filter((c) =>
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
    totalEarned: kidStats?.totalEarned ?? 0,
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
