import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { calculateLevel, getLevelInfo } from "@/lib/badges";
import { evaluateAndAwardBadges } from "@/lib/badge-evaluator";
import { getPeriodStartPT, buildBonusNote, getBaseSchedule, isSchoolDayBasic, getTodayStringPT } from "@/lib/date-utils";

// GET /api/points - Get kid's total points and ledger history
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");

    // If no kidId specified and user is a kid, use their own ID
    const targetKidId = kidId || (session.user.role === "KID" ? session.user.id : null);

    if (!targetKidId) {
      return NextResponse.json(
        { error: "kidId parameter required for parents" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: targetKidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found or not in your family" },
        { status: 404 }
      );
    }

    // Get all point entries for this kid
    const entries = await prisma.pointEntry.findMany({
      where: {
        familyId: session.user.familyId!,
        kidId: targetKidId,
      },
      include: {
        chore: {
          select: { title: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
        redemption: {
          include: {
            reward: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate total points for kid
    const totalPoints = entries.reduce((sum: number, entry: { points: number }) => sum + entry.points, 0);

    // Get lifetime stats
    const kidStats = await prisma.kidStats.findUnique({
      where: { kidId: targetKidId },
    });

    return NextResponse.json({
      totalPoints,
      totalEarned: kidStats?.totalEarned ?? entries.filter((e: { points: number }) => e.points > 0).reduce((s: number, e: { points: number }) => s + e.points, 0),
      totalSpent: kidStats?.totalSpent ?? entries.filter((e: { points: number }) => e.points < 0).reduce((s: number, e: { points: number }) => s + Math.abs(e.points), 0),
      entries,
      kid: {
        id: kid.id,
        name: kid.name,
        email: kid.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// POST /api/points - Add a point entry (parent only)
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can add points" },
        { status: 403 }
      );
    }

    const { kidId, choreId, points, note, date, photoUrl } = await req.json();

    if (!kidId || points === undefined) {
      return NextResponse.json(
        { error: "kidId and points are required" },
        { status: 400 }
      );
    }

    if (typeof points !== 'number') {
      return NextResponse.json(
        { error: "points must be a number" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
      return NextResponse.json(
        { error: "Invalid kid" },
        { status: 400 }
      );
    }

    // If choreId provided, verify it belongs to family
    if (choreId) {
      const chore = await prisma.chore.findUnique({
        where: { id: choreId },
      });

      if (!chore || chore.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: "Invalid chore" },
          { status: 400 }
        );
      }
    }

    const pointEntry = await prisma.pointEntry.create({
      data: {
        familyId: session.user.familyId!,
        kidId,
        choreId: choreId || null,
        points,
        note: note || null,
        photoUrl: photoUrl || null,
        date: date ? new Date(date + "T12:00:00") : new Date(),
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      include: {
        chore: {
          select: { title: true, icon: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    // Update KidStats running totals
    if (points > 0) {
      await prisma.kidStats.upsert({
        where: { kidId },
        create: {
          kidId,
          familyId: session.user.familyId!,
          totalEarned: points,
          totalSpent: 0,
        },
        update: {
          totalEarned: { increment: points },
        },
      });
    } else if (points < 0) {
      await prisma.kidStats.upsert({
        where: { kidId },
        create: {
          kidId,
          familyId: session.user.familyId!,
          totalEarned: 0,
          totalSpent: Math.abs(points),
        },
        update: {
          totalSpent: { increment: Math.abs(points) },
        },
      });
    }

    // Update badge if this is a chore completion (positive points with choreId)
    let badgeLevelUp = null;
    if (choreId && points > 0) {
      // Get or create badge
      const existingBadge = await prisma.badge.findUnique({
        where: {
          kidId_choreId: { kidId, choreId },
        },
      });

      const now = new Date();
      const newCount = (existingBadge?.count || 0) + 1;
      const newLevel = calculateLevel(newCount);
      const oldLevel = existingBadge?.level || 0;
      const leveledUp = newLevel > oldLevel;

      const badge = await prisma.badge.upsert({
        where: {
          kidId_choreId: { kidId, choreId },
        },
        create: {
          familyId: session.user.familyId!,
          kidId,
          choreId,
          count: 1,
          level: newLevel,
          firstEarnedAt: now,
          lastLevelUpAt: now,
        },
        update: {
          count: newCount,
          level: newLevel,
          ...(leveledUp ? { lastLevelUpAt: now } : {}),
        },
        include: {
          chore: {
            select: { title: true, icon: true },
          },
        },
      });

      // Return level-up info if badge leveled up
      if (leveledUp) {
        const levelInfo = getLevelInfo(newLevel);
        badgeLevelUp = {
          choreTitle: badge.chore.title,
          choreIcon: badge.chore.icon,
          newLevel,
          levelName: levelInfo?.name || null,
          levelIcon: levelInfo?.icon || null,
          count: newCount,
          isFirstTime: oldLevel === 0,
        };
      }
    }

    // Evaluate achievement badges (runs async to check all badge rules)
    const achievementBadges = await evaluateAndAwardBadges(
      prisma,
      kidId,
      session.user.familyId!,
      {
        points,
        choreId: choreId || null,
        date: pointEntry.date,
      }
    );

    // Category completion bonus: if all chores in a schedule are done, award 5pt bonus
    let categoryBonus = null;
    if (choreId && points > 0) {
      const completedChore = await prisma.chore.findUnique({
        where: { id: choreId },
        select: { schedule: true },
      });

      if (completedChore?.schedule) {
        const schedule = completedChore.schedule;
        const baseSchedule = getBaseSchedule(schedule);
        const periodStart = getPeriodStartPT(baseSchedule);
        const bonusNote = buildBonusNote(schedule);
        const BONUS_POINTS = 5;

        // Get all active chores in this base schedule for the family
        // Include both "morning" and "morning_weekday" variants
        const allScheduleChores = await prisma.chore.findMany({
          where: {
            familyId: session.user.familyId!,
            isActive: true,
            OR: [
              { schedule: baseSchedule },
              { schedule: `${baseSchedule}_weekday` },
            ],
          },
          select: { id: true, schedule: true },
        });

        // Check custom off-days for school-day determination
        const todayStr = getTodayStringPT();
        const customOffDay = await prisma.schoolOff.findFirst({
          where: {
            familyId: session.user.familyId!,
            date: new Date(todayStr + "T00:00:00"),
          },
        });
        const isSchoolDay = isSchoolDayBasic() && !customOffDay;

        // Filter out weekday-only chores on non-school days
        const activeChores = allScheduleChores.filter(
          (c) => c.schedule?.endsWith("_weekday") ? isSchoolDay : true
        );

        // Get completed chore IDs for this kid in this period
        const completedEntries = await prisma.pointEntry.findMany({
          where: {
            kidId,
            choreId: { not: null },
            date: { gte: periodStart },
            points: { gt: 0 },
          },
          select: { choreId: true },
        });

        const completedChoreIds = new Set(
          completedEntries.map((e) => e.choreId).filter(Boolean)
        );

        // Check if ALL active schedule chores are now completed
        const allDone = activeChores.every((c) =>
          completedChoreIds.has(c.id)
        );

        if (allDone) {
          // Check if bonus was already awarded for this period
          const existingBonus = await prisma.pointEntry.findFirst({
            where: {
              kidId,
              choreId: null,
              date: { gte: periodStart },
              note: bonusNote,
              points: BONUS_POINTS,
            },
          });

          if (!existingBonus) {
            const bonusEntry = await prisma.pointEntry.create({
              data: {
                familyId: session.user.familyId!,
                kidId,
                points: BONUS_POINTS,
                note: bonusNote,
                date: new Date(),
                createdById: session.user.id,
                updatedById: session.user.id,
              },
            });

            // Update KidStats for the bonus
            await prisma.kidStats.upsert({
              where: { kidId },
              create: {
                kidId,
                familyId: session.user.familyId!,
                totalEarned: BONUS_POINTS,
                totalSpent: 0,
              },
              update: {
                totalEarned: { increment: BONUS_POINTS },
              },
            });

            categoryBonus = {
              schedule,
              bonusNote,
              points: BONUS_POINTS,
              entryId: bonusEntry.id,
            };
          }
        }
      }
    }

    return NextResponse.json({
      pointEntry,
      badgeLevelUp,
      achievementBadges: achievementBadges.length > 0 ? achievementBadges : null,
      categoryBonus,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
