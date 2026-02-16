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

    // Get timezone from query params (sent by client)
    const timezone = searchParams.get("timezone") || "America/Los_Angeles";

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

    // Helper to get date string in user's timezone
    const getLocalDateString = (date: Date, tz: string): string => {
      return date.toLocaleDateString("en-CA", { timeZone: tz }); // "YYYY-MM-DD" format
    };

    // Get today's date in user's timezone
    const todayLocal = getLocalDateString(new Date(), timezone);

    // Find the first word that hasn't been completed today
    // A word is "completed for today" if quizPassedAt is today (in user's timezone)
    let todaysWord = null;
    let completedCount = 0;
    let alreadyCompletedToday = false;

    for (const word of allWords) {
      const wordProgress = progressMap.get(word.id);

      if (wordProgress?.quizPassedAt) {
        const passedDateLocal = getLocalDateString(
          new Date(wordProgress.quizPassedAt),
          timezone
        );

        if (passedDateLocal === todayLocal) {
          // This word was completed today (in user's timezone)
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

    // If all words have been completed, recycle through them
    if (!todaysWord) {
      // Check if any word was already quizzed today
      const anyCompletedToday = allWords.some((word) => {
        const wp = progressMap.get(word.id);
        if (!wp?.quizPassedAt) return false;
        return getLocalDateString(new Date(wp.quizPassedAt), timezone) === todayLocal;
      });

      if (anyCompletedToday) {
        return NextResponse.json({
          sightWord: null,
          message: "alreadyCompletedToday",
          isReview: true,
          progress: { current: allWords.length, total: allWords.length },
        });
      }

      // Find first word (by sort order) where pointAwarded = true → reset and serve
      let reviewWord = null;
      for (const word of allWords) {
        const wp = progressMap.get(word.id);
        if (wp?.pointAwarded) {
          await prisma.sightWordProgress.update({
            where: {
              kidId_sightWordId: { kidId: targetKidId, sightWordId: word.id },
            },
            data: { pointAwarded: false },
          });
          reviewWord = word;
          break;
        }
      }

      if (!reviewWord) {
        // All words have pointAwarded = false (full cycle done) — reset all and start over
        await prisma.sightWordProgress.updateMany({
          where: { kidId: targetKidId, sightWordId: { in: allWords.map((w) => w.id) } },
          data: { pointAwarded: true },
        });
        const firstWord = allWords[0];
        await prisma.sightWordProgress.update({
          where: {
            kidId_sightWordId: { kidId: targetKidId, sightWordId: firstWord.id },
          },
          data: { pointAwarded: false },
        });
        reviewWord = firstWord;
      }

      return NextResponse.json({
        sightWord: {
          id: reviewWord.id,
          word: reviewWord.word,
          imageUrl: reviewWord.imageUrl,
        },
        alreadyCompletedToday: false,
        isReview: true,
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
      isReview: false,
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
