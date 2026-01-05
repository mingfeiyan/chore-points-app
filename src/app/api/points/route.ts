import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/points - Get kid's total points and ledger history
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");

    // If no kidId specified and user is a kid, use their own ID
    const targetKidId = kidId || (session.user.role === "KID" ? session.user.id : null);

    if (!targetKidId) {
      return NextResponse.json(
        { error: "kidId parameter required for parents" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: targetKidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found or not in your family" },
        { status: 404 }
      );
    }

    // Get all point entries for this kid
    const entries = await prisma.pointEntry.findMany({
      where: {
        familyId: session.user.familyId!,
        kidId: targetKidId,
      },
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
        redemption: {
          include: {
            reward: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Calculate total points for kid
    const totalPoints = entries.reduce((sum: number, entry: { points: number }) => sum + entry.points, 0);

    return NextResponse.json({
      totalPoints,
      entries,
      kid: {
        id: kid.id,
        name: kid.name,
        email: kid.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// POST /api/points - Add a point entry (parent only)
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can add points" },
        { status: 403 }
      );
    }

    const { kidId, choreId, points, note, date } = await req.json();

    if (!kidId || points === undefined) {
      return NextResponse.json(
        { error: "kidId and points are required" },
        { status: 400 }
      );
    }

    if (typeof points !== 'number') {
      return NextResponse.json(
        { error: "points must be a number" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
      return NextResponse.json(
        { error: "Invalid kid" },
        { status: 400 }
      );
    }

    // If choreId provided, verify it belongs to family
    if (choreId) {
      const chore = await prisma.chore.findUnique({
        where: { id: choreId },
      });

      if (!chore || chore.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: "Invalid chore" },
          { status: 400 }
        );
      }
    }

    const pointEntry = await prisma.pointEntry.create({
      data: {
        familyId: session.user.familyId!,
        kidId,
        choreId: choreId || null,
        points,
        note: note || null,
        date: date ? new Date(date) : new Date(),
        createdById: session.user.id,
        updatedById: session.user.id,
      },
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

    return NextResponse.json({ pointEntry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
