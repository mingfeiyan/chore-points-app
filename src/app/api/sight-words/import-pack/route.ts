import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import { STARTER_PACKS } from "@/lib/sight-word-starter-packs";
import { generateSightWordImage } from "@/lib/gemini-image";

const BOOTSTRAP_IMAGE_COUNT = 3;

export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
    const { packId } = await req.json();

    const pack = STARTER_PACKS[packId];
    if (!pack) {
      return NextResponse.json({ error: "Unknown starter pack" }, { status: 400 });
    }

    const familyId = session.user.familyId!;

    const existing = await prisma.sightWord.findMany({
      where: { familyId },
      select: { word: true, sortOrder: true },
    });
    const existingWordsLower = new Set(existing.map((w) => w.word.toLowerCase()));
    const maxOrder = existing.reduce(
      (acc, w) => (w.sortOrder > acc ? w.sortOrder : acc),
      -1
    );

    const toCreate = pack.words.filter(
      (w) => !existingWordsLower.has(w.toLowerCase())
    );

    if (toCreate.length === 0) {
      return NextResponse.json({ imported: 0, skipped: pack.words.length });
    }

    await prisma.sightWord.createMany({
      data: toCreate.map((word, idx) => ({
        word,
        familyId,
        sortOrder: maxOrder + 1 + idx,
        createdById: session.user.id,
        updatedById: session.user.id,
      })),
    });

    const bootstrapWords = await prisma.sightWord.findMany({
      where: { familyId, imageUrl: null, isActive: true },
      orderBy: { sortOrder: "asc" },
      take: BOOTSTRAP_IMAGE_COUNT,
    });

    after(async () => {
      for (const sw of bootstrapWords) {
        try {
          const url = await generateSightWordImage(sw.word, familyId);
          await prisma.sightWord.update({
            where: { id: sw.id },
            data: { imageUrl: url, updatedById: session.user.id },
          });
        } catch (err) {
          console.error(
            `[sight-words] bootstrap image gen failed for "${sw.word}":`,
            err
          );
        }
      }
    });

    return NextResponse.json({
      imported: toCreate.length,
      skipped: pack.words.length - toCreate.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
