import { PrismaClient } from "@prisma/client";

// Context passed to badge evaluation functions
export type BadgeEvaluationContext = {
  prisma: PrismaClient;
  kidId: string;
  familyId: string;
  // The point entry that triggered the evaluation (if any)
  triggeredBy?: {
    points: number;
    choreId: string | null;
    date: Date;
  };
};

// Result from badge evaluation
export type BadgeEvaluationResult = {
  earned: boolean;
  metadata?: Record<string, unknown>;
};

// Badge definition structure
export type AchievementBadgeDefinition = {
  id: string;
  name: string;
  nameZh: string; // Chinese name
  description: string;
  descriptionZh: string; // Chinese description
  icon: string;
  // Optional default image URL. If set, families without their own
  // BadgeTemplate override see this image instead of the emoji icon.
  imageUrl?: string;
  // Function to evaluate if the badge should be awarded
  evaluate: (ctx: BadgeEvaluationContext) => Promise<BadgeEvaluationResult>;
};

// =============================================================================
// BADGE DEFINITIONS
// Add new badges here by following the pattern below
// =============================================================================

export const ACHIEVEMENT_BADGES: AchievementBadgeDefinition[] = [
  // ---------------------------------------------------------------------------
  // STREAK BADGES
  // ---------------------------------------------------------------------------
  {
    id: "streak_7_days_10pts",
    name: "Week Warrior",
    nameZh: "周冠军",
    description: "Earned 10+ points every day for 7 consecutive days",
    descriptionZh: "连续7天每天获得10分以上",
    icon: "🔥",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768696474260-LYRVZnpuU5KZxAzhBS1jpK51aAmQMr.jpg",
    evaluate: async (ctx) => {
      return evaluateStreakBadge(ctx, 7, 10);
    },
  },
  {
    id: "streak_14_days_10pts",
    name: "Fortnight Champion",
    nameZh: "双周达人",
    description: "Earned 10+ points every day for 14 consecutive days",
    descriptionZh: "连续14天每天获得10分以上",
    icon: "⚡",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768696241205-QaOsV5q38b5szec7YzPAPsEfNb2Sxq.jpg",
    evaluate: async (ctx) => {
      return evaluateStreakBadge(ctx, 14, 10);
    },
  },
  {
    id: "streak_30_days_10pts",
    name: "Monthly Master",
    nameZh: "月度大师",
    description: "Earned 10+ points every day for 30 consecutive days",
    descriptionZh: "连续30天每天获得10分以上",
    icon: "👑",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768689303078-gYaHr2OI6Z631kdaxCbtkwmSn8s7RV.jpg",
    evaluate: async (ctx) => {
      return evaluateStreakBadge(ctx, 30, 10);
    },
  },

  // ---------------------------------------------------------------------------
  // MILESTONE BADGES - Total Points
  // ---------------------------------------------------------------------------
  {
    id: "milestone_100_points",
    name: "Century Club",
    nameZh: "百分俱乐部",
    description: "Earned a total of 100 points",
    descriptionZh: "累计获得100分",
    icon: "💯",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768689167570-beYvnzb03UPIL6C3avYFovDnfB6A5o.jpg",
    evaluate: async (ctx) => {
      return evaluateTotalPointsMilestone(ctx, 100);
    },
  },
  {
    id: "milestone_500_points",
    name: "High Achiever",
    nameZh: "高分达人",
    description: "Earned a total of 500 points",
    descriptionZh: "累计获得500分",
    icon: "🌟",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768689182893-1qUSVwDpXhme9BMFCr5WN4lLpfDOSR.jpg",
    evaluate: async (ctx) => {
      return evaluateTotalPointsMilestone(ctx, 500);
    },
  },
  {
    id: "milestone_1000_points",
    name: "Superstar",
    nameZh: "超级明星",
    description: "Earned a total of 1000 points",
    descriptionZh: "累计获得1000分",
    icon: "🏆",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768696102331-znnM8AkESqqTMPUAbxJuQxLKKC7HsE.jpg",
    evaluate: async (ctx) => {
      return evaluateTotalPointsMilestone(ctx, 1000);
    },
  },
  {
    id: "milestone_1500_points",
    name: "Legend",
    nameZh: "传奇",
    description: "Earned a total of 1500 points",
    descriptionZh: "累计获得1500分",
    icon: "💎",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1769386960088-GXQ5vl4HjdwyZalDbieEJtMcR6uX5l.jpg",
    evaluate: async (ctx) => {
      return evaluateTotalPointsMilestone(ctx, 1500);
    },
  },
  {
    id: "milestone_2000_points",
    name: "Grand Master",
    nameZh: "大宗师",
    description: "Earned a total of 2000 points",
    descriptionZh: "累计获得2000分",
    icon: "👑",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1769386980767-OiCtmYCgYOgmEQj3zvJJEB8F5y8deO.jpg",
    evaluate: async (ctx) => {
      return evaluateTotalPointsMilestone(ctx, 2000);
    },
  },

  // ---------------------------------------------------------------------------
  // VARIETY BADGES - Different Chores
  // ---------------------------------------------------------------------------
  {
    id: "variety_5_chores",
    name: "Jack of All Trades",
    nameZh: "多面手",
    description: "Completed 5 different types of chores",
    descriptionZh: "完成了5种不同的家务",
    icon: "🎭",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768688876777-EnHhzceuWiaD2ryG1rQiaAi2CLnQQv.jpg",
    evaluate: async (ctx) => {
      return evaluateVarietyBadge(ctx, 5);
    },
  },
  {
    id: "variety_10_chores",
    name: "Master of Many",
    nameZh: "全能小帮手",
    description: "Completed 10 different types of chores",
    descriptionZh: "完成了10种不同的家务",
    icon: "🎪",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768696730220-uAXstq5wio5dyl1eWWkYozG2JwC2Qa.jpg",
    evaluate: async (ctx) => {
      return evaluateVarietyBadge(ctx, 10);
    },
  },

  // ---------------------------------------------------------------------------
  // FIRST TIME BADGES
  // ---------------------------------------------------------------------------
  {
    id: "first_chore",
    name: "Getting Started",
    nameZh: "初出茅庐",
    description: "Completed your very first chore",
    descriptionZh: "完成了第一个家务",
    icon: "🎉",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768688347880-wip5Z6bbkGomMrSbuCR8VU096ScT57.jpg",
    evaluate: async (ctx) => {
      const count = await ctx.prisma.pointEntry.count({
        where: {
          kidId: ctx.kidId,
          choreId: { not: null },
          points: { gt: 0 },
        },
      });
      return {
        earned: count >= 1,
        metadata: { totalChores: count },
      };
    },
  },

  // ---------------------------------------------------------------------------
  // WEEKLY PERFORMANCE BADGES
  // ---------------------------------------------------------------------------
  {
    id: "weekly_50_points",
    name: "Super Week",
    nameZh: "超级一周",
    description: "Earned 50+ points in a single week",
    descriptionZh: "一周内获得50分以上",
    icon: "📅",
    imageUrl:
      "https://yk03gs3qzrtaag1r.public.blob.vercel-storage.com/families/cmk0dov3z0001aajp1mue9g2u/points/1768688729640-gkTozM38p4B4M7KlBQKnWj07BKqMvL.jpg",
    evaluate: async (ctx) => {
      return evaluateWeeklyPointsBadge(ctx, 50);
    },
  },
];

// =============================================================================
// HELPER EVALUATION FUNCTIONS
// =============================================================================

/**
 * Evaluates streak badges (X consecutive days with Y+ points per day)
 */
async function evaluateStreakBadge(
  ctx: BadgeEvaluationContext,
  requiredDays: number,
  minPointsPerDay: number
): Promise<BadgeEvaluationResult> {
  // Get daily point totals for the kid, ordered by date descending
  const dailyPoints = await ctx.prisma.$queryRaw<
    { date: Date; total: bigint }[]
  >`
    SELECT DATE(date) as date, SUM(points) as total
    FROM "PointEntry"
    WHERE "kidId" = ${ctx.kidId}
      AND "familyId" = ${ctx.familyId}
      AND points > 0
    GROUP BY DATE(date)
    ORDER BY DATE(date) DESC
  `;

  if (dailyPoints.length < requiredDays) {
    return { earned: false };
  }

  // Check for consecutive days with minimum points
  let currentStreak = 0;
  let streakStartDate: Date | null = null;
  let streakEndDate: Date | null = null;
  let prevDate: Date | null = null;

  for (const day of dailyPoints) {
    const dayTotal = Number(day.total);
    const currentDate = new Date(day.date);

    if (dayTotal >= minPointsPerDay) {
      if (prevDate === null) {
        // First qualifying day
        currentStreak = 1;
        streakEndDate = currentDate;
        streakStartDate = currentDate;
      } else {
        // Check if consecutive (within 1-2 days to handle timezone issues)
        const dayDiff = Math.abs(
          (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayDiff <= 1.5) {
          currentStreak++;
          streakStartDate = currentDate;
        } else {
          // Streak broken, start new one
          currentStreak = 1;
          streakEndDate = currentDate;
          streakStartDate = currentDate;
        }
      }
      prevDate = currentDate;

      if (currentStreak >= requiredDays) {
        return {
          earned: true,
          metadata: {
            streakDays: currentStreak,
            streakStartDate: streakStartDate?.toISOString(),
            streakEndDate: streakEndDate?.toISOString(),
          },
        };
      }
    } else {
      // Day doesn't meet minimum, reset streak
      currentStreak = 0;
      prevDate = null;
      streakStartDate = null;
      streakEndDate = null;
    }
  }

  return { earned: false };
}

/**
 * Evaluates total points milestone badges
 */
async function evaluateTotalPointsMilestone(
  ctx: BadgeEvaluationContext,
  requiredPoints: number
): Promise<BadgeEvaluationResult> {
  const result = await ctx.prisma.pointEntry.aggregate({
    where: {
      kidId: ctx.kidId,
      familyId: ctx.familyId,
    },
    _sum: {
      points: true,
    },
  });

  const totalPoints = result._sum.points || 0;

  return {
    earned: totalPoints >= requiredPoints,
    metadata: { totalPoints },
  };
}

/**
 * Evaluates variety badges (completed X different chore types)
 */
async function evaluateVarietyBadge(
  ctx: BadgeEvaluationContext,
  requiredChoreTypes: number
): Promise<BadgeEvaluationResult> {
  const uniqueChores = await ctx.prisma.pointEntry.findMany({
    where: {
      kidId: ctx.kidId,
      familyId: ctx.familyId,
      choreId: { not: null },
      points: { gt: 0 },
    },
    select: {
      choreId: true,
    },
    distinct: ["choreId"],
  });

  const uniqueCount = uniqueChores.length;

  return {
    earned: uniqueCount >= requiredChoreTypes,
    metadata: { uniqueChoreTypes: uniqueCount },
  };
}

/**
 * Evaluates weekly points badges (earned X+ points in any single week)
 */
async function evaluateWeeklyPointsBadge(
  ctx: BadgeEvaluationContext,
  requiredPoints: number
): Promise<BadgeEvaluationResult> {
  // Get weekly point totals
  const weeklyPoints = await ctx.prisma.$queryRaw<
    { week: Date; total: bigint }[]
  >`
    SELECT DATE_TRUNC('week', date) as week, SUM(points) as total
    FROM "PointEntry"
    WHERE "kidId" = ${ctx.kidId}
      AND "familyId" = ${ctx.familyId}
      AND points > 0
    GROUP BY DATE_TRUNC('week', date)
    HAVING SUM(points) >= ${requiredPoints}
    LIMIT 1
  `;

  if (weeklyPoints.length > 0) {
    return {
      earned: true,
      metadata: {
        weekStart: weeklyPoints[0].week,
        weeklyTotal: Number(weeklyPoints[0].total),
      },
    };
  }

  return { earned: false };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get badge definition by ID
 */
export function getAchievementBadgeById(
  id: string
): AchievementBadgeDefinition | undefined {
  return ACHIEVEMENT_BADGES.find((b) => b.id === id);
}

/**
 * Get all badge definitions
 */
export function getAllAchievementBadges(): AchievementBadgeDefinition[] {
  return ACHIEVEMENT_BADGES;
}
