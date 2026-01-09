import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// PUT /api/milestones/[id] - Update a milestone (parent only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();

    const { id } = await params;
    const { title, description, icon, date, imageUrl, kidId } = await req.json();

    // Verify milestone belongs to user's family
    const existingMilestone = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!existingMilestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (existingMilestone.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Forbidden: Milestone belongs to another family" },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title) {
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (icon !== undefined) {
      updateData.icon = icon || null;
    }

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null;
    }

    if (kidId !== undefined) {
      // Verify new kid belongs to user's family
      const kid = await prisma.user.findUnique({
        where: { id: kidId },
      });

      if (!kid || kid.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: "Kid not found in your family" },
          { status: 404 }
        );
      }
      updateData.kidId = kidId;
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: updateData,
      include: {
        kid: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ milestone });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Not a parent" || error.message === "No family") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/milestones/[id] - Delete a milestone (parent only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();

    const { id } = await params;

    // Verify milestone belongs to user's family
    const existingMilestone = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!existingMilestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (existingMilestone.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Forbidden: Milestone belongs to another family" },
        { status: 403 }
      );
    }

    await prisma.milestone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Not a parent" || error.message === "No family") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
