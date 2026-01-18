import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// POST /api/sight-words/quiz - Submit a quiz answer and award point if correct
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    const { sightWordId, answer, kidId } = await req.json();

    // Determine the target kid - either the logged-in kid, or the kid specified by parent
    let targetKidId = session.user.id;

    if (session.user.role === "PARENT" && kidId) {
      // Parent submitting on behalf of a kid (view-as mode)
      const kid = await prisma.user.findUnique({
        where: { id: kidId },
      });
      if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
        return NextResponse.json(
          { error: "Invalid kid" },
          { status: 400 }
        );
      }
      targetKidId = kidId;
    } else if (session.user.role !== "KID") {
      return NextResponse.json(
        { error: "kidId is required for parents" },
        { status: 400 }
      );
    }

    if (!sightWordId || !answer) {
      return NextResponse.json(
        { error: "sightWordId and answer are required" },
        { status: 400 }
      );
    }

    // Get the sight word
    const sightWord = await prisma.sightWord.findUnique({
      where: { id: sightWordId },
    });

    if (!sightWord || sightWord.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Sight word not found" },
        { status: 404 }
      );
    }

    // Check if answer is correct (case-insensitive)
    const isCorrect = answer.trim().toLowerCase() === sightWord.word.toLowerCase();

    if (!isCorrect) {
      return NextResponse.json({
        correct: false,
        pointAwarded: false,
        message: "incorrect",
      });
    }

    // Check if already completed today (using UTC for timezone-agnostic comparison)
    const todayUTC = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    const existingProgress = await prisma.sightWordProgress.findUnique({
      where: {
        kidId_sightWordId: {
          kidId: targetKidId,
          sightWordId,
        },
      },
    });

    // Check if already passed today
    let alreadyPassedToday = false;
    if (existingProgress?.quizPassedAt) {
      const passedDateUTC = new Date(existingProgress.quizPassedAt)
        .toISOString()
        .split("T")[0];
      alreadyPassedToday = passedDateUTC === todayUTC;
    }

    if (alreadyPassedToday) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "alreadyCompleted",
      });
    }

    // Award point and update progress in a transaction
    await prisma.$transaction([
      prisma.sightWordProgress.upsert({
        where: {
          kidId_sightWordId: {
            kidId: targetKidId,
            sightWordId,
          },
        },
        create: {
          kidId: targetKidId,
          sightWordId,
          viewedAt: new Date(),
          quizPassedAt: new Date(),
          pointAwarded: true,
        },
        update: {
          quizPassedAt: new Date(),
          pointAwarded: true,
        },
      }),
      prisma.pointEntry.create({
        data: {
          familyId: session.user.familyId!,
          kidId: targetKidId,
          points: 1,
          note: `Sight word: ${sightWord.word}`,
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      correct: true,
      pointAwarded: true,
      message: "success",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
