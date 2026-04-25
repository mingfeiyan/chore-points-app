import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily, requireParentInFamily } from "@/lib/permissions";

// GET /api/family/kids - Get all kids in the family
export async function GET() {
  try {
    const session = await requireFamily();

    const kids = await prisma.user.findMany({
      where: {
        familyId: session.user.familyId!,
        role: "KID",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ kids });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// POST /api/family/kids - Parent creates a kid profile (no login).
// The kid gets a synthetic unique email and no password, so credentials
// auth fails by definition. Used for families where parents track kids
// they don't want signing in directly.
export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
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

    const syntheticEmail = `kid-${crypto.randomUUID()}@local.gemsteps.app`;

    const kid = await prisma.user.create({
      data: {
        email: syntheticEmail,
        name: name.trim(),
        role: "KID",
        familyId: session.user.familyId!,
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ kid }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Something went wrong" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
