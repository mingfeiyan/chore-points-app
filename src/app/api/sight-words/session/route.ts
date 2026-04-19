import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { getLocalDateString } from "@/lib/math-utils";

const SESSION_SIZE = 3;

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
    const today = getLocalDateString(new Date(), timezone);

    let completedCount = 0;
    let completedTodayCount = 0;
    for (const word of allWords) {
      const wp = progressMap.get(word.id);
      if (!wp?.quizPassedAt) continue;
      completedCount++;
      if (getLocalDateString(new Date(wp.quizPassedAt), timezone) === today) {
        completedTodayCount++;
      }
    }

    const pickEligible = (allowReviewCycle: boolean) => {
      const picked: typeof allWords = [];
      for (const word of allWords) {
        if (picked.length >= SESSION_SIZE) break;
        const wp = progressMap.get(word.id);
        if (wp?.quizPassedAt) {
          const passedDate = getLocalDateString(new Date(wp.quizPassedAt), timezone);
          if (passedDate === today) continue;
          if (!wp.pointAwarded && !allowReviewCycle) continue;
        }
        picked.push(word);
      }
      return picked;
    };

    let sessionWords = pickEligible(false);
    let isReview = sessionWords.some((w) => !!progressMap.get(w.id)?.quizPassedAt);

    if (sessionWords.length === 0) {
      if (completedTodayCount > 0 && completedCount === allWords.length) {
        return NextResponse.json({
          words: [],
          message: "alreadyDoneToday",
          isReview: true,
          progress: { current: allWords.length, total: allWords.length },
        });
      }

      await prisma.sightWordProgress.updateMany({
        where: {
          kidId: targetKidId,
          sightWordId: { in: allWords.map((w) => w.id) },
        },
        data: { pointAwarded: true },
      });
      for (const [id, wp] of progressMap) {
        progressMap.set(id, { ...wp, pointAwarded: true });
      }

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
