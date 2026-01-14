import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// PUT /api/sight-words/reorder - Reorder sight words
export async function PUT(req: Request) {
  try {
    const session = await requireParentInFamily();
    const { wordIds } = await req.json();

    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return NextResponse.json(
        { error: "wordIds array is required" },
        { status: 400 }
      );
    }

    // Verify all word IDs belong to the family
    const existingWords = await prisma.sightWord.findMany({
      where: {
        id: { in: wordIds },
        familyId: session.user.familyId!,
      },
    });

    if (existingWords.length !== wordIds.length) {
      return NextResponse.json(
        { error: "Some sight words not found or don't belong to your family" },
        { status: 400 }
      );
    }

    // Update sort order for each word
    await prisma.$transaction(
      wordIds.map((id, index) =>
        prisma.sightWord.update({
          where: { id },
          data: {
            sortOrder: index,
            updatedById: session.user.id,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
