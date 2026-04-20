import type { PrismaClient } from "@prisma/client";
import { generateBadgeImage } from "@/lib/gemini-image";

export const CUSTOM_AWARD_BADGE_PREFIX = "custom-award-";

export function isCustomAwardBadgeId(badgeId: string): boolean {
  return badgeId.startsWith(CUSTOM_AWARD_BADGE_PREFIX);
}

export function customAwardBadgeIdFor(pointEntryId: string): string {
  return `${CUSTOM_AWARD_BADGE_PREFIX}${pointEntryId}`;
}

export type CustomAwardBadgeMetadata = {
  taskDescription: string;
  points: number;
  imageUrl: string | null;
};

export function parseCustomAwardBadgeMetadata(
  raw: unknown
): Partial<CustomAwardBadgeMetadata> {
  return (raw ?? {}) as Partial<CustomAwardBadgeMetadata>;
}

export async function generateAndStoreBadgeImage(
  prisma: PrismaClient,
  badgeId: string,
  familyId: string,
  taskDescription: string,
  points: number
): Promise<string> {
  const imageUrl = await generateBadgeImage(taskDescription, familyId);
  await prisma.achievementBadge.update({
    where: { id: badgeId },
    data: {
      metadata: { taskDescription, points, imageUrl } satisfies CustomAwardBadgeMetadata,
    },
  });
  return imageUrl;
}
