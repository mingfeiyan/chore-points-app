import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

type Params = Promise<{ id: string }>;

// PUT /api/badge-templates/[id] - Update a badge template
export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;
    const body = await req.json();

    // Find the template and verify ownership
    const existing = await prisma.badgeTemplate.findFirst({
      where: {
        id,
        familyId: session.user.familyId!,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Badge template not found" },
        { status: 404 }
      );
    }

    const {
      name,
      nameZh,
      description,
      descriptionZh,
      imageUrl,
      icon,
      ruleConfig,
      isActive,
    } = body;

    const template = await prisma.badgeTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        nameZh: nameZh !== undefined ? nameZh : existing.nameZh,
        description: description !== undefined ? description : existing.description,
        descriptionZh: descriptionZh !== undefined ? descriptionZh : existing.descriptionZh,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        icon: icon !== undefined ? icon : existing.icon,
        ruleConfig: ruleConfig !== undefined ? ruleConfig : existing.ruleConfig,
        isActive: isActive !== undefined ? isActive : existing.isActive,
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

    return NextResponse.json({ template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// DELETE /api/badge-templates/[id] - Delete a badge template
export async function DELETE(req: Request, { params }: { params: Params }) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;

    // Find the template and verify ownership
    const existing = await prisma.badgeTemplate.findFirst({
      where: {
        id,
        familyId: session.user.familyId!,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Badge template not found" },
        { status: 404 }
      );
    }

    await prisma.badgeTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
