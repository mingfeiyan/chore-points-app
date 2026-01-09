import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// GET /api/milestones - Get all milestones for the family (parent only)
export async function GET(req: Request) {
  try {
    const session = await requireParentInFamily();

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");

    const whereClause: any = {
      familyId: session.user.familyId!,
    };

    // Optional filter by kid
    if (kidId) {
      whereClause.kidId = kidId;
    }

    const milestones = await prisma.milestone.findMany({
      where: whereClause,
      include: {
        kid: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ milestones });
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

// POST /api/milestones - Create a new milestone (parent only)
export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();

    const { kidId, title, description, icon, date, imageUrl } = await req.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    if (!kidId || typeof kidId !== "string") {
      return NextResponse.json(
        { error: "Kid ID is required" },
        { status: 400 }
      );
    }

    // Verify kid belongs to user's family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found in your family" },
        { status: 404 }
      );
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        description: description || null,
        icon: icon || null,
        date: date ? new Date(date) : new Date(),
        imageUrl: imageUrl || null,
        familyId: session.user.familyId!,
        kidId,
        createdById: session.user.id,
      },
      include: {
        kid: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
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
