import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { getLevelInfo, getProgressToNextLevel } from "@/lib/badges";
import { getAchievementBadgeById, ACHIEVEMENT_BADGES } from "@/lib/achievement-badges";
import {
  isCustomAwardBadgeId,
  parseCustomAwardBadgeMetadata,
} from "@/lib/custom-award-badge";

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

    // Fetch all badge templates for the family. We use all of them to
    // build the `hidden` filter — `hidden` is independent of `isActive`
    // (a template can be inactive but still mark the badge as hidden, or
    // active without hiding) — but we only apply image/name overrides
    // from active templates.
    const allTemplates = await prisma.badgeTemplate.findMany({
      where: { familyId: session.user.familyId! },
    });

    const activeTemplates = allTemplates.filter((t) => t.isActive);

    // Create lookup maps for templates (image/name overrides come only
    // from active templates).
    const achievementTemplateMap = new Map(
      activeTemplates
        .filter((t) => t.type === "achievement" && t.builtInBadgeId)
        .map((t) => [t.builtInBadgeId!, t])
    );
    const choreTemplateMap = new Map(
      activeTemplates
        .filter((t) => t.type === "chore_level" && t.choreId)
        .map((t) => [t.choreId!, t])
    );

    // Hidden sets: only filter for KIDs. Parents always see all badges
    // in Settings → Badge Management (otherwise they couldn't unhide).
    const hiddenAchievementIds = new Set(
      allTemplates
        .filter((t) => t.type === "achievement" && t.builtInBadgeId && t.hidden)
        .map((t) => t.builtInBadgeId!)
    );
    const hiddenChoreIds = new Set(
      allTemplates
        .filter((t) => t.type === "chore_level" && t.choreId && t.hidden)
        .map((t) => t.choreId!)
    );
    const isKid = session.user.role === Role.KID;

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

    const enrichedAchievementBadges = achievementBadges.map((badge) => {
      if (isCustomAwardBadgeId(badge.badgeId)) {
        const meta = parseCustomAwardBadgeMetadata(badge.metadata);
        const name = meta.taskDescription?.slice(0, 40) || "Custom award";
        return {
          ...badge,
          name,
          nameZh: name,
          description: meta.taskDescription || "",
          descriptionZh: meta.taskDescription || "",
          icon: "🎨",
          customImageUrl: meta.imageUrl || null,
          isCustomAward: true,
          points: meta.points ?? null,
        };
      }

      const definition = getAchievementBadgeById(badge.badgeId);
      const template = achievementTemplateMap.get(badge.badgeId);

      return {
        ...badge,
        name: template?.name || definition?.name || badge.badgeId,
        nameZh: template?.nameZh || definition?.nameZh || badge.badgeId,
        description: template?.description || definition?.description || "",
        descriptionZh: template?.descriptionZh || definition?.descriptionZh || "",
        icon: template?.icon || definition?.icon || "🏅",
        customImageUrl: template?.imageUrl || definition?.imageUrl || null,
        isCustomAward: false,
      };
    });

    // Get all possible achievement badges for the sticker book view
    const allAchievementBadges = ACHIEVEMENT_BADGES.map((badge) => {
      const template = achievementTemplateMap.get(badge.id);
      return {
        id: badge.id,
        name: template?.name || badge.name,
        nameZh: template?.nameZh || badge.nameZh,
        description: template?.description || badge.description,
        descriptionZh: template?.descriptionZh || badge.descriptionZh,
        icon: template?.icon || badge.icon,
        customImageUrl: template?.imageUrl || badge.imageUrl || null,
      };
    });

    // For kids, drop badges the parent has hidden. Custom-award badges
    // (AI-generated) don't have a template and are never filtered.
    const visibleBadges = isKid
      ? enrichedBadges.filter((b) => !hiddenChoreIds.has(b.choreId))
      : enrichedBadges;
    const visibleAchievementBadges = isKid
      ? enrichedAchievementBadges.filter(
          (b) => b.isCustomAward || !hiddenAchievementIds.has(b.badgeId)
        )
      : enrichedAchievementBadges;
    const visibleAllAchievementBadges = isKid
      ? allAchievementBadges.filter((b) => !hiddenAchievementIds.has(b.id))
      : allAchievementBadges;

    return NextResponse.json({
      badges: visibleBadges,
      achievementBadges: visibleAchievementBadges,
      allAchievementBadges: visibleAllAchievementBadges,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    if (message === "Unauthorized" || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
