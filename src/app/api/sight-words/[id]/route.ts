import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// PUT /api/sight-words/[id] - Update a sight word
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;
    const { word, imageUrl, isActive } = await req.json();

    // Verify sight word belongs to family
    const existing = await prisma.sightWord.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Sight word not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedById: session.user.id,
    };

    if (word !== undefined) {
      if (typeof word !== "string" || word.trim() === "") {
        return NextResponse.json(
          { error: "Word cannot be empty" },
          { status: 400 }
        );
      }
      updateData.word = word.trim();
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const sightWord = await prisma.sightWord.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ sightWord });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// DELETE /api/sight-words/[id] - Delete a sight word
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;

    // Verify sight word belongs to family
    const existing = await prisma.sightWord.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Sight word not found" },
        { status: 404 }
      );
    }

    await prisma.sightWord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
