import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import {
  generateAndStoreBadgeImage,
  isCustomAwardBadgeId,
  parseCustomAwardBadgeMetadata,
} from "@/lib/custom-award-badge";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;

    const badge = await prisma.achievementBadge.findUnique({ where: { id } });
    if (!badge || badge.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    if (!isCustomAwardBadgeId(badge.badgeId)) {
      return NextResponse.json(
        { error: "Only custom-award badges can be regenerated" },
        { status: 400 }
      );
    }

    const meta = parseCustomAwardBadgeMetadata(badge.metadata);
    const taskDescription = meta.taskDescription?.trim();
    if (!taskDescription || typeof meta.points !== "number") {
      return NextResponse.json(
        { error: "Badge metadata is incomplete" },
        { status: 400 }
      );
    }

    const imageUrl = await generateAndStoreBadgeImage(
      prisma,
      id,
      session.user.familyId!,
      taskDescription,
      meta.points
    );

    return NextResponse.json({ imageUrl });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("[custom-badge] regenerate failed:", error);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
