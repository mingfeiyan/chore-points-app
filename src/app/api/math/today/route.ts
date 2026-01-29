import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateDailyMathProblems,
  getLocalDateString,
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

    // Generate today's problems (deterministic based on date + kidId)
    const problems = generateDailyMathProblems(todayStr, targetKidId);

    // Get progress for today
    const progress = await prisma.mathProgress.findUnique({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
    });

    return NextResponse.json({
      addition: { a: problems.addition.a, b: problems.addition.b },
      subtraction: { a: problems.subtraction.a, b: problems.subtraction.b },
      additionComplete: !!progress?.additionPassedAt,
      subtractionComplete: !!progress?.subtractionPassedAt,
      pointAwarded: !!progress?.pointAwarded,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}
