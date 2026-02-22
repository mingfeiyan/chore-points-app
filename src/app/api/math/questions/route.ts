import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { getLocalDateString } from "@/lib/math-utils";

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
    const scheduledDate = searchParams.get("scheduledDate");
    const kidIdParam = searchParams.get("kidId");

    const where: Record<string, unknown> = {
      familyId: session.user.familyId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (scheduledDate) {
      where.scheduledDate = scheduledDate;
    }

    if (kidIdParam) {
      where.kidId = kidIdParam;
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

    // Validate scheduledDate: must be today or future
    const firstScheduledDate = questionsInput[0]?.scheduledDate;
    if (firstScheduledDate) {
      const todayStr = getLocalDateString(new Date(), "America/Los_Angeles");
      if (firstScheduledDate < todayStr) {
        return NextResponse.json(
          { error: "Cannot schedule questions for past dates" },
          { status: 400 }
        );
      }
    }

    // Validate max 10 questions per kid per day
    const firstKidId = questionsInput[0]?.kidId;
    if (firstScheduledDate && firstKidId) {
      const existingCount = await prisma.customMathQuestion.count({
        where: {
          familyId: session.user.familyId!,
          kidId: firstKidId,
          scheduledDate: firstScheduledDate,
        },
      });
      if (existingCount + questionsInput.length > 10) {
        return NextResponse.json(
          { error: "Maximum 10 questions per kid per day" },
          { status: 400 }
        );
      }
    }

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
          scheduledDate: q.scheduledDate || null,
          kidId: q.kidId || null,
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

// PUT /api/math/questions - Atomically replace all questions for a kid+date
export async function PUT(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { kidId, scheduledDate, questions: questionsInput } = await req.json();

    if (!kidId || !scheduledDate) {
      return NextResponse.json(
        { error: "kidId and scheduledDate are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questionsInput)) {
      return NextResponse.json(
        { error: "questions must be an array" },
        { status: 400 }
      );
    }

    if (questionsInput.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 questions per kid per day" },
        { status: 400 }
      );
    }

    // Validate date is today or future
    const todayStr = getLocalDateString(new Date(), "America/Los_Angeles");
    if (scheduledDate < todayStr) {
      return NextResponse.json(
        { error: "Cannot schedule questions for past dates" },
        { status: 400 }
      );
    }

    // Validate kid belongs to family
    const kid = await prisma.user.findUnique({ where: { id: kidId } });
    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Kid not found" }, { status: 404 });
    }

    // Atomic: delete all existing + create new in one transaction
    const created = await prisma.$transaction(async (tx) => {
      await tx.customMathQuestion.deleteMany({
        where: {
          familyId: session.user.familyId!,
          kidId,
          scheduledDate,
        },
      });

      const results = [];
      for (let i = 0; i < questionsInput.length; i++) {
        const q = questionsInput[i];
        if (!q.question || typeof q.answer !== "number") continue;

        const question = await tx.customMathQuestion.create({
          data: {
            familyId: session.user.familyId!,
            createdById: session.user.id,
            question: q.question,
            answer: q.answer,
            questionType: q.questionType || "custom",
            tags: q.tags || [],
            isActive: true,
            sortOrder: i,
            scheduledDate,
            kidId,
          },
        });
        results.push(question);
      }
      return results;
    });

    return NextResponse.json({
      questions: created,
      count: created.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/math/questions - Bulk delete questions for a kid+date
export async function DELETE(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const scheduledDate = searchParams.get("scheduledDate");

    if (!kidId || !scheduledDate) {
      return NextResponse.json(
        { error: "kidId and scheduledDate are required" },
        { status: 400 }
      );
    }

    const result = await prisma.customMathQuestion.deleteMany({
      where: {
        familyId: session.user.familyId!,
        kidId,
        scheduledDate,
      },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
