import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateDailyMathProblems,
  getLocalDateString,
} from "@/lib/math-utils";

// POST /api/math/submit - Submit a math answer
export async function POST(req: Request) {
  try {
    const session = await requireFamily();
    const {
      type,
      answer,
      kidId,
      timezone = "America/Los_Angeles",
    } = await req.json();

    // Validate type
    if (type !== "addition" && type !== "subtraction") {
      return NextResponse.json(
        { error: "type must be 'addition' or 'subtraction'" },
        { status: 400 }
      );
    }

    if (typeof answer !== "number") {
      return NextResponse.json(
        { error: "answer must be a number" },
        { status: 400 }
      );
    }

    // Determine target kid ID
    let targetKidId = session.user.id;

    if (session.user.role === "PARENT" && kidId) {
      const kid = await prisma.user.findUnique({
        where: { id: kidId },
      });
      if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
        return NextResponse.json({ error: "Invalid kid" }, { status: 400 });
      }
      targetKidId = kidId;
    } else if (session.user.role !== "KID") {
      return NextResponse.json(
        { error: "kidId is required for parents" },
        { status: 400 }
      );
    }

    // Get today's date in user's timezone
    const todayStr = getLocalDateString(new Date(), timezone);

    // Generate today's problems
    const problems = generateDailyMathProblems(todayStr, targetKidId);
    const expectedAnswer =
      type === "addition" ? problems.addition.answer : problems.subtraction.answer;

    // Check if correct
    const isCorrect = answer === expectedAnswer;

    if (!isCorrect) {
      return NextResponse.json({
        correct: false,
        pointAwarded: false,
      });
    }

    // Get or create progress record
    const existingProgress = await prisma.mathProgress.findUnique({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
    });

    // Check if already completed this type today
    if (type === "addition" && existingProgress?.additionPassedAt) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "alreadyCompleted",
      });
    }
    if (type === "subtraction" && existingProgress?.subtractionPassedAt) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "alreadyCompleted",
      });
    }

    // Update progress
    const updateData =
      type === "addition"
        ? { additionPassedAt: new Date() }
        : { subtractionPassedAt: new Date() };

    const updatedProgress = await prisma.mathProgress.upsert({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
      create: {
        kidId: targetKidId,
        date: todayStr,
        ...updateData,
      },
      update: updateData,
    });

    // Check if both are now complete and point not yet awarded
    const bothComplete =
      updatedProgress.additionPassedAt && updatedProgress.subtractionPassedAt;
    let pointAwarded = false;

    if (bothComplete && !updatedProgress.pointAwarded) {
      // Award point
      await prisma.$transaction([
        prisma.mathProgress.update({
          where: { id: updatedProgress.id },
          data: { pointAwarded: true },
        }),
        prisma.pointEntry.create({
          data: {
            familyId: session.user.familyId!,
            kidId: targetKidId,
            points: 1,
            note: "Math: daily practice",
            createdById: session.user.id,
            updatedById: session.user.id,
          },
        }),
      ]);
      pointAwarded = true;
    }

    return NextResponse.json({
      correct: true,
      pointAwarded,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
