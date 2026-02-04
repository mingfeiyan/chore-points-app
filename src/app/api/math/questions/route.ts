import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/questions - List custom questions
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = {
      familyId: session.user.familyId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const questions = await prisma.customMathQuestion.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// POST /api/math/questions - Add custom question(s)
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const body = await req.json();

    // Support single question or array for bulk import
    const questionsInput = Array.isArray(body) ? body : [body];

    const created = [];
    for (const q of questionsInput) {
      if (!q.question || typeof q.answer !== "number") {
        continue; // Skip invalid entries in bulk import
      }

      const question = await prisma.customMathQuestion.create({
        data: {
          familyId: session.user.familyId!,
          createdById: session.user.id,
          question: q.question,
          answer: q.answer,
          questionType: q.questionType || "custom",
          tags: q.tags || [],
          isActive: q.isActive !== false,
          sortOrder: q.sortOrder || 0,
        },
      });
      created.push(question);
    }

    return NextResponse.json({
      questions: created,
      count: created.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
