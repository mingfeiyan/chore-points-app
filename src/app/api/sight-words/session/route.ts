import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

const SESSION_SIZE = 3;

function localDateString(date: Date, tz: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: tz });
}

export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const timezone = searchParams.get("timezone") || "America/Los_Angeles";

    const targetKidId =
      kidId || (session.user.role === "KID" ? session.user.id : null);
    if (!targetKidId) {
      return NextResponse.json(
        { error: "kidId parameter required for parents" },
        { status: 400 }
      );
    }

    const kid = await prisma.user.findUnique({ where: { id: targetKidId } });
    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found or not in your family" },
        { status: 404 }
      );
    }

    const allWords = await prisma.sightWord.findMany({
      where: { familyId: session.user.familyId!, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (allWords.length === 0) {
      return NextResponse.json({
        words: [],
        message: "noWords",
        progress: { current: 0, total: 0 },
      });
    }

    const progress = await prisma.sightWordProgress.findMany({
      where: { kidId: targetKidId },
    });
    const progressMap = new Map(progress.map((p) => [p.sightWordId, p]));
    const today = localDateString(new Date(), timezone);

    const completedCount = allWords.filter((w) => {
      const wp = progressMap.get(w.id);
      return !!wp?.quizPassedAt;
    }).length;

    const pickEligible = (allowReviewCycle: boolean) => {
      const picked: typeof allWords = [];
      for (const word of allWords) {
        if (picked.length >= SESSION_SIZE) break;
        const wp = progressMap.get(word.id);
        if (wp?.quizPassedAt) {
          const passedDate = localDateString(new Date(wp.quizPassedAt), timezone);
          if (passedDate === today) continue;
          if (!wp.pointAwarded && !allowReviewCycle) continue;
        }
        picked.push(word);
      }
      return picked;
    };

    let sessionWords = pickEligible(false);
    let isReview = sessionWords.some((w) => {
      const wp = progressMap.get(w.id);
      return !!wp?.quizPassedAt;
    });

    if (sessionWords.length === 0) {
      // Either done today or full review cycle exhausted — check which
      const anyTodayCompleted = allWords.some((w) => {
        const wp = progressMap.get(w.id);
        return (
          !!wp?.quizPassedAt &&
          localDateString(new Date(wp.quizPassedAt), timezone) === today
        );
      });

      if (anyTodayCompleted && completedCount === allWords.length) {
        return NextResponse.json({
          words: [],
          message: "alreadyDoneToday",
          isReview: true,
          progress: { current: allWords.length, total: allWords.length },
        });
      }

      // Reset review cycle and pick again
      await prisma.sightWordProgress.updateMany({
        where: {
          kidId: targetKidId,
          sightWordId: { in: allWords.map((w) => w.id) },
        },
        data: { pointAwarded: true },
      });

      const refreshed = await prisma.sightWordProgress.findMany({
        where: { kidId: targetKidId },
      });
      for (const p of refreshed) progressMap.set(p.sightWordId, p);

      sessionWords = pickEligible(true);
      isReview = true;
    }

    return NextResponse.json({
      words: sessionWords.map((w) => ({
        id: w.id,
        word: w.word,
        imageUrl: w.imageUrl,
      })),
      isReview,
      progress: { current: completedCount, total: allWords.length },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 401 }
    );
  }
}
