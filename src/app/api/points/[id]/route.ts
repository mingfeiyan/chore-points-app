import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// PUT /api/points/[id] - Update a point entry (parent only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can edit points" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { points, note, choreId, date, photoUrl } = await req.json();

    // Verify point entry belongs to user's family
    const existingEntry = await prisma.pointEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Point entry not found" },
        { status: 404 }
      );
    }

    if (existingEntry.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Forbidden: Point entry belongs to another family" },
        { status: 403 }
      );
    }

    // Can't edit point entries linked to redemptions
    if (existingEntry.redemptionId) {
      return NextResponse.json(
        { error: "Cannot edit point entries linked to redemptions" },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedById: session.user.id,
    };

    if (points !== undefined) {
      if (typeof points !== 'number') {
        return NextResponse.json(
          { error: "points must be a number" },
          { status: 400 }
        );
      }
      updateData.points = points;
    }

    if (note !== undefined) updateData.note = note || null;
    if (choreId !== undefined) updateData.choreId = choreId || null;
    if (date !== undefined) updateData.date = new Date(date + "T12:00:00");
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;

    const pointEntry = await prisma.pointEntry.update({
      where: { id },
      data: updateData,
      include: {
        chore: {
          select: { title: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    // If points changed, adjust KidStats
    if (points !== undefined && points !== existingEntry.points) {
      const oldPts = existingEntry.points;
      const newPts = points;
      const statsUpdate: any = {};

      // Reverse old
      if (oldPts > 0) statsUpdate.totalEarned = { decrement: oldPts };
      else if (oldPts < 0) statsUpdate.totalSpent = { decrement: Math.abs(oldPts) };

      // We need two separate updates since Prisma can't increment and decrement different fields atomically in one call
      if (Object.keys(statsUpdate).length > 0) {
        await prisma.kidStats.update({
          where: { kidId: existingEntry.kidId },
          data: statsUpdate,
        }).catch(() => {}); // Ignore if stats row doesn't exist yet
      }

      // Apply new
      const statsApply: any = {};
      if (newPts > 0) statsApply.totalEarned = { increment: newPts };
      else if (newPts < 0) statsApply.totalSpent = { increment: Math.abs(newPts) };

      if (Object.keys(statsApply).length > 0) {
        await prisma.kidStats.upsert({
          where: { kidId: existingEntry.kidId },
          create: {
            kidId: existingEntry.kidId,
            familyId: existingEntry.familyId,
            totalEarned: newPts > 0 ? newPts : 0,
            totalSpent: newPts < 0 ? Math.abs(newPts) : 0,
          },
          update: statsApply,
        });
      }
    }

    return NextResponse.json({ pointEntry });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/points/[id] - Delete a point entry (parent only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can delete points" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify point entry belongs to user's family
    const existingEntry = await prisma.pointEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Point entry not found" },
        { status: 404 }
      );
    }

    if (existingEntry.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Forbidden: Point entry belongs to another family" },
        { status: 403 }
      );
    }

    // Can't delete point entries linked to redemptions
    if (existingEntry.redemptionId) {
      return NextResponse.json(
        { error: "Cannot delete point entries linked to redemptions" },
        { status: 400 }
      );
    }

    await prisma.pointEntry.delete({
      where: { id },
    });

    // Adjust KidStats to reverse the deleted entry
    if (existingEntry.points > 0) {
      await prisma.kidStats.update({
        where: { kidId: existingEntry.kidId },
        data: { totalEarned: { decrement: existingEntry.points } },
      }).catch(() => {});
    } else if (existingEntry.points < 0) {
      await prisma.kidStats.update({
        where: { kidId: existingEntry.kidId },
        data: { totalSpent: { decrement: Math.abs(existingEntry.points) } },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
