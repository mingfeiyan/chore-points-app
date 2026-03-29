import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// GET /api/chores - List all chores for the family
export async function GET() {
  try {
    const session = await requireParentInFamily();

    const chores = await prisma.chore.findMany({
      where: { familyId: session.user.familyId! },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ chores });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// POST /api/chores - Create a new chore
export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
    const { title, defaultPoints, icon } = await req.json();

    if (!title || defaultPoints === undefined || !icon) {
      return NextResponse.json(
        { error: "Title, icon, and defaultPoints are required" },
        { status: 400 }
      );
    }

    if (typeof defaultPoints !== 'number' || defaultPoints < 0) {
      return NextResponse.json(
        { error: "defaultPoints must be a non-negative number" },
        { status: 400 }
      );
    }

    const chore = await prisma.chore.create({
      data: {
        title,
        icon,
        defaultPoints,
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

    return NextResponse.json({ chore }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
