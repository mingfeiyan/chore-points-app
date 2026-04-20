import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import { generateBadgeImage } from "@/lib/gemini-image";

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

    if (!badge.badgeId.startsWith("custom-award-")) {
      return NextResponse.json(
        { error: "Only custom-award badges can be regenerated" },
        { status: 400 }
      );
    }

    const meta = (badge.metadata ?? {}) as {
      taskDescription?: string;
      points?: number;
      imageUrl?: string | null;
    };
    const taskDescription = meta.taskDescription?.trim();
    if (!taskDescription) {
      return NextResponse.json(
        { error: "Badge has no task description" },
        { status: 400 }
      );
    }

    const imageUrl = await generateBadgeImage(
      taskDescription,
      session.user.familyId!
    );

    const updated = await prisma.achievementBadge.update({
      where: { id },
      data: {
        metadata: {
          taskDescription,
          points: meta.points ?? null,
          imageUrl,
        },
      },
    });

    return NextResponse.json({ badge: updated });
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
