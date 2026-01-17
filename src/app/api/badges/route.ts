import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { getLevelInfo, getProgressToNextLevel } from "@/lib/badges";
import { getAchievementBadgeById, ACHIEVEMENT_BADGES } from "@/lib/achievement-badges";

// GET /api/badges - Get badges for the family
// Parents can see all badges, kids can only see their own
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");

    const whereClause: { familyId: string; kidId?: string } = {
      familyId: session.user.familyId!,
    };

    // Kids can only see their own badges
    if (session.user.role === Role.KID) {
      whereClause.kidId = session.user.id;
    } else if (kidId) {
      // Parents can filter by kid
      whereClause.kidId = kidId;
    }

    // Fetch badge templates for the family (for custom images)
    const badgeTemplates = await prisma.badgeTemplate.findMany({
      where: { familyId: session.user.familyId!, isActive: true },
    });

    // Create lookup maps for templates
    const achievementTemplateMap = new Map(
      badgeTemplates
        .filter((t) => t.type === "achievement" && t.builtInBadgeId)
        .map((t) => [t.builtInBadgeId!, t])
    );
    const choreTemplateMap = new Map(
      badgeTemplates
        .filter((t) => t.type === "chore_level" && t.choreId)
        .map((t) => [t.choreId!, t])
    );

    const badges = await prisma.badge.findMany({
      where: whereClause,
      include: {
        kid: {
          select: { id: true, name: true },
        },
        chore: {
          select: { id: true, title: true, icon: true },
        },
      },
      orderBy: [
        { level: "desc" },
        { count: "desc" },
      ],
    });

    // Enrich with level info, progress, and custom template data
    const enrichedBadges = badges.map((badge) => {
      const levelInfo = getLevelInfo(badge.level);
      const progress = getProgressToNextLevel(badge.count);
      const template = choreTemplateMap.get(badge.choreId);

      return {
        ...badge,
        levelName: levelInfo?.name || null,
        levelIcon: levelInfo?.icon || null,
        progress: progress.progress,
        nextLevelAt: progress.next,
        // Add custom template data if available
        customImageUrl: template?.imageUrl || null,
        customIcon: template?.icon || null,
      };
    });

    // Also get achievement badges
    const achievementBadges = await prisma.achievementBadge.findMany({
      where: whereClause,
      include: {
        kid: {
          select: { id: true, name: true },
        },
      },
      orderBy: { earnedAt: "desc" },
    });

    // Enrich achievement badges with definitions and custom template data
    const enrichedAchievementBadges = achievementBadges.map((badge) => {
      const definition = getAchievementBadgeById(badge.badgeId);
      const template = achievementTemplateMap.get(badge.badgeId);

      return {
        ...badge,
        name: template?.name || definition?.name || badge.badgeId,
        nameZh: template?.nameZh || definition?.nameZh || badge.badgeId,
        description: template?.description || definition?.description || "",
        descriptionZh: template?.descriptionZh || definition?.descriptionZh || "",
        icon: template?.icon || definition?.icon || "🏅",
        // Add custom template data if available
        customImageUrl: template?.imageUrl || null,
      };
    });

    // Get all possible achievement badges for the sticker book view
    const allAchievementBadges = ACHIEVEMENT_BADGES.map((badge) => {
      const template = achievementTemplateMap.get(badge.id);
      return {
        id: badge.id,
        name: template?.name || badge.name,
        nameZh: template?.nameZh || badge.nameZh,
        icon: template?.icon || badge.icon,
        customImageUrl: template?.imageUrl || null,
      };
    });

    return NextResponse.json({
      badges: enrichedBadges,
      achievementBadges: enrichedAchievementBadges,
      allAchievementBadges,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    if (message === "Unauthorized" || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
