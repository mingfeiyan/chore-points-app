import { PrismaClient } from "@prisma/client";
import {
  ACHIEVEMENT_BADGES,
  BadgeEvaluationContext,
  getAchievementBadgeById,
} from "./achievement-badges";

export type NewlyEarnedBadge = {
  badgeId: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
  customImageUrl?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Evaluates all achievement badges for a kid and awards any newly earned ones.
 * Returns the list of newly earned badges.
 */
export async function evaluateAndAwardBadges(
  prisma: PrismaClient,
  kidId: string,
  familyId: string,
  triggeredBy?: {
    points: number;
    choreId: string | null;
    date: Date;
  }
): Promise<NewlyEarnedBadge[]> {
  const newlyEarned: NewlyEarnedBadge[] = [];

  // Get badges the kid has already earned
  const earnedBadges = await prisma.achievementBadge.findMany({
    where: { kidId },
    select: { badgeId: true },
  });
  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId));

  // Create evaluation context
  const ctx: BadgeEvaluationContext = {
    prisma,
    kidId,
    familyId,
    triggeredBy,
  };

  // Evaluate each badge that hasn't been earned yet
  for (const badge of ACHIEVEMENT_BADGES) {
    if (earnedBadgeIds.has(badge.id)) {
      continue; // Already earned
    }

    try {
      const result = await badge.evaluate(ctx);

      if (result.earned) {
        // Award the badge
        await prisma.achievementBadge.create({
          data: {
            familyId,
            kidId,
            badgeId: badge.id,
            metadata: result.metadata ? JSON.parse(JSON.stringify(result.metadata)) : undefined,
          },
        });

        newlyEarned.push({
          badgeId: badge.id,
          name: badge.name,
          nameZh: badge.nameZh,
          description: badge.description,
          descriptionZh: badge.descriptionZh,
          icon: badge.icon,
          customImageUrl: badge.imageUrl ?? null,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      console.error(`Error evaluating badge ${badge.id}:`, error);
      // Continue with other badges
    }
  }

  return newlyEarned;
}

/**
 * Get all earned achievement badges for a kid with their definitions
 */
export async function getEarnedAchievementBadges(
  prisma: PrismaClient,
  kidId: string
) {
  const earned = await prisma.achievementBadge.findMany({
    where: { kidId },
    orderBy: { earnedAt: "desc" },
  });

  return earned.map((badge) => {
    const definition = getAchievementBadgeById(badge.badgeId);
    return {
      id: badge.id,
      badgeId: badge.badgeId,
      earnedAt: badge.earnedAt,
      metadata: badge.metadata,
      name: definition?.name || badge.badgeId,
      nameZh: definition?.nameZh || badge.badgeId,
      description: definition?.description || "",
      descriptionZh: definition?.descriptionZh || "",
      icon: definition?.icon || "🏅",
    };
  });
}
