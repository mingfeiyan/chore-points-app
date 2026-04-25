import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

async function loadKidInFamily(kidId: string, familyId: string) {
  const kid = await prisma.user.findUnique({ where: { id: kidId } });
  if (!kid || kid.familyId !== familyId || kid.role !== "KID") return null;
  return kid;
}

// PATCH /api/family/kids/:id - rename a kid in the parent's family.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const name: unknown = body?.name;

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (name.trim().length > 60) {
      return NextResponse.json(
        { error: "Name is too long (max 60 characters)" },
        { status: 400 }
      );
    }

    const kid = await loadKidInFamily(id, session.user.familyId!);
    if (!kid) {
      return NextResponse.json({ error: "Kid not found in your family" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ kid: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// DELETE /api/family/kids/:id - permanently remove a kid and their
// per-kid history. PointEntry and Redemption don't cascade on User
// delete (no onDelete in the schema) and CustomMathQuestion.kidId is
// nullable, so handle those explicitly inside a transaction. Photos,
// badges, sight-word progress, math progress and attempts cascade
// automatically.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await params;

    const kid = await loadKidInFamily(id, session.user.familyId!);
    if (!kid) {
      return NextResponse.json({ error: "Kid not found in your family" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.customMathQuestion.updateMany({
        where: { kidId: id },
        data: { kidId: null },
      });
      await tx.pointEntry.deleteMany({ where: { kidId: id } });
      await tx.redemption.deleteMany({ where: { kidId: id } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
