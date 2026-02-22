import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateQuestionsWithSettings,
  getLocalDateString,
  Question,
} from "@/lib/math-utils";

// GET /api/math/today - Get today's math problems and completion status
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const timezone = searchParams.get("timezone") || "America/Los_Angeles";

    // Determine target kid ID
    const targetKidId =
      kidId || (session.user.role === "KID" ? session.user.id : null);

    if (!targetKidId) {
      return NextResponse.json(
        { error: "kidId parameter required for parents" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: targetKidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found or not in your family" },
        { status: 404 }
      );
    }

    // Get today's date in user's timezone
    const todayStr = getLocalDateString(new Date(), timezone);

    // Check for custom scheduled questions first
    const customQuestions = await prisma.customMathQuestion.findMany({
      where: {
        familyId: session.user.familyId!,
        kidId: targetKidId,
        scheduledDate: todayStr,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    let questionsOut: { index: number; type: string; question: string; a?: number; b?: number }[];
    let questionsTarget: number;
    let source: "custom" | "auto";

    if (customQuestions.length > 0) {
      source = "custom";
      questionsTarget = customQuestions.length;
      questionsOut = customQuestions.map((q, i) => ({
        index: i,
        type: q.questionType,
        question: q.question,
      }));
    } else {
      source = "auto";
      const settings = await prisma.mathSettings.findUnique({
        where: { familyId: session.user.familyId! },
      });
      questionsTarget = settings?.dailyQuestionCount ?? 2;
      const generated = generateQuestionsWithSettings(todayStr, targetKidId, settings || {});
      questionsOut = generated.map((q: Question) => ({
        index: q.index,
        type: q.type,
        a: q.a,
        b: q.b,
        question: q.question,
      }));
    }

    // Get progress for today
    const progress = await prisma.mathProgress.findUnique({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
    });

    const questionsCompleted = progress?.questionsCompleted ?? 0;
    const allComplete = questionsCompleted >= questionsTarget;

    return NextResponse.json({
      questions: questionsOut,
      questionsCompleted,
      questionsTarget,
      allComplete,
      pointAwarded: progress?.pointAwarded ?? false,
      source,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 401 }
    );
  }
}
