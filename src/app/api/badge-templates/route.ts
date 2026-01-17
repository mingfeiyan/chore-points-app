import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// GET /api/badge-templates - List all badge templates for the family
export async function GET() {
  try {
    const session = await requireParentInFamily();

    const templates = await prisma.badgeTemplate.findMany({
      where: { familyId: session.user.familyId! },
      include: {
        chore: {
          select: { id: true, title: true, icon: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: [
        { type: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// POST /api/badge-templates - Create a new badge template
export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
    const body = await req.json();

    const {
      builtInBadgeId,
      choreId,
      type,
      name,
      nameZh,
      description,
      descriptionZh,
      imageUrl,
      icon,
      ruleConfig,
    } = body;

    // Validate type
    const validTypes = ["achievement", "chore_level", "custom"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'achievement', 'chore_level', or 'custom'" },
        { status: 400 }
      );
    }

    // Validate that we have the right identifiers for the type
    if (type === "achievement" && !builtInBadgeId) {
      return NextResponse.json(
        { error: "builtInBadgeId is required for achievement type" },
        { status: 400 }
      );
    }

    if (type === "chore_level" && !choreId) {
      return NextResponse.json(
        { error: "choreId is required for chore_level type" },
        { status: 400 }
      );
    }

    // If choreId is provided, verify it belongs to the family
    if (choreId) {
      const chore = await prisma.chore.findFirst({
        where: {
          id: choreId,
          familyId: session.user.familyId!,
        },
      });

      if (!chore) {
        return NextResponse.json(
          { error: "Chore not found" },
          { status: 404 }
        );
      }
    }

    const template = await prisma.badgeTemplate.create({
      data: {
        familyId: session.user.familyId!,
        builtInBadgeId: builtInBadgeId || null,
        choreId: choreId || null,
        type: type || "custom",
        name: name || null,
        nameZh: nameZh || null,
        description: description || null,
        descriptionZh: descriptionZh || null,
        imageUrl: imageUrl || null,
        icon: icon || null,
        ruleConfig: ruleConfig || null,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      include: {
        chore: {
          select: { id: true, title: true, icon: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        updatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";

    // Handle unique constraint violations
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A template for this badge already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
