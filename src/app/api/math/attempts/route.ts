import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/attempts - Get attempt history for analytics
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const incorrectOnly = searchParams.get("incorrectOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {
      kid: { familyId: session.user.familyId },
    };

    if (kidId) {
      where.kidId = kidId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        (where.createdAt as Record<string, Date>).gte = new Date(from);
      }
      if (to) {
        (where.createdAt as Record<string, Date>).lte = new Date(to);
      }
    }

    if (type) {
      where.questionType = type;
    }

    if (incorrectOnly) {
      where.isCorrect = false;
    }

    const [attempts, total] = await Promise.all([
      prisma.mathAttempt.findMany({
        where,
        include: {
          kid: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.mathAttempt.count({ where }),
    ]);

    return NextResponse.json({
      attempts,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
