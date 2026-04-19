import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import { generateSightWordImage } from "@/lib/gemini-image";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;

    const existing = await prisma.sightWord.findUnique({ where: { id } });
    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Sight word not found" },
        { status: 404 }
      );
    }

    const url = await generateSightWordImage(existing.word, session.user.familyId!);

    const sightWord = await prisma.sightWord.update({
      where: { id },
      data: { imageUrl: url, updatedById: session.user.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ sightWord });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("[sight-words] generate-image failed:", error);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
