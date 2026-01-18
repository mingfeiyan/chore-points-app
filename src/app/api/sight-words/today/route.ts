import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/sight-words/today - Get today's sight word for the kid
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");

    // Determine target kid ID
    const targetKidId = kidId || (session.user.role === "KID" ? session.user.id : null);

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

    // Get all active sight words for the family, ordered by sortOrder
    const allWords = await prisma.sightWord.findMany({
      where: {
        familyId: session.user.familyId!,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    if (allWords.length === 0) {
      return NextResponse.json({
        sightWord: null,
        message: "noWords",
        progress: { current: 0, total: 0 },
      });
    }

    // Get kid's progress records
    const progress = await prisma.sightWordProgress.findMany({
      where: { kidId: targetKidId },
    });

    // Build a map of wordId -> progress
    const progressMap = new Map(progress.map((p) => [p.sightWordId, p]));

    // Get today's date in UTC for timezone-agnostic comparison
    const todayUTC = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Find the first word that hasn't been completed today
    // A word is "completed for today" if quizPassedAt is today (in UTC)
    let todaysWord = null;
    let completedCount = 0;
    let alreadyCompletedToday = false;

    for (const word of allWords) {
      const wordProgress = progressMap.get(word.id);

      if (wordProgress?.quizPassedAt) {
        const passedDateUTC = new Date(wordProgress.quizPassedAt)
          .toISOString()
          .split("T")[0];

        if (passedDateUTC === todayUTC) {
          // This word was completed today (in UTC)
          completedCount++;
          if (!todaysWord) {
            // This is today's word (already completed)
            todaysWord = word;
            alreadyCompletedToday = true;
          }
        } else {
          // Completed on a different day - counts toward overall progress
          // but should NOT be selected as today's word (we want to advance to next uncompleted word)
          completedCount++;
        }
      } else {
        // Never completed - this is the next word to learn
        if (!todaysWord) {
          todaysWord = word;
          alreadyCompletedToday = false;
        }
      }
    }

    // If all words have been completed, show the last one or cycle back
    if (!todaysWord) {
      // All words completed - show completion message or cycle
      return NextResponse.json({
        sightWord: null,
        message: "allComplete",
        progress: { current: allWords.length, total: allWords.length },
      });
    }

    return NextResponse.json({
      sightWord: {
        id: todaysWord.id,
        word: todaysWord.word,
        imageUrl: todaysWord.imageUrl,
      },
      alreadyCompletedToday,
      progress: {
        current: completedCount,
        total: allWords.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}
