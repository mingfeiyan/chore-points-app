import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT /api/math/questions/[id] - Update a question
export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { id } = await context.params;
    const data = await req.json();

    // Verify question belongs to family
    const existing = await prisma.customMathQuestion.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const question = await prisma.customMathQuestion.update({
      where: { id },
      data: {
        question: data.question,
        answer: data.answer,
        questionType: data.questionType,
        tags: data.tags,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json(question);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/math/questions/[id] - Delete a question
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { id } = await context.params;

    // Verify question belongs to family
    const existing = await prisma.customMathQuestion.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    await prisma.customMathQuestion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
