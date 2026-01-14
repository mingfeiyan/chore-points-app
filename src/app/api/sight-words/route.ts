import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// GET /api/sight-words - List all sight words for the family
export async function GET() {
  try {
    const session = await requireParentInFamily();

    const sightWords = await prisma.sightWord.findMany({
      where: { familyId: session.user.familyId! },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ sightWords });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// POST /api/sight-words - Create a new sight word
export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
    const { word, imageUrl } = await req.json();

    if (!word || typeof word !== "string" || word.trim() === "") {
      return NextResponse.json(
        { error: "Word is required" },
        { status: 400 }
      );
    }

    // Get the max sortOrder to place new word at the end
    const maxOrderResult = await prisma.sightWord.aggregate({
      where: { familyId: session.user.familyId! },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrderResult._max.sortOrder ?? -1) + 1;

    const sightWord = await prisma.sightWord.create({
      data: {
        word: word.trim(),
        imageUrl: imageUrl || null,
        sortOrder: nextOrder,
        familyId: session.user.familyId!,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ sightWord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
