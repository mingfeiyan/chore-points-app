import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
    const { kidId, note, points, photoUrl } = await req.json();

    if (typeof kidId !== "string" || typeof note !== "string") {
      return NextResponse.json(
        { error: "kidId and note must be strings" },
        { status: 400 }
      );
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length === 0 || trimmedNote.length > 100) {
      return NextResponse.json(
        { error: "Item name must be 1–100 characters" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(points) || points < 1 || points > 999) {
      return NextResponse.json(
        { error: "Points must be an integer between 1 and 999" },
        { status: 400 }
      );
    }

    const url =
      typeof photoUrl === "string" &&
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(photoUrl)
        ? photoUrl
        : null;
    if (photoUrl && !url) {
      return NextResponse.json(
        { error: "photoUrl must be a Vercel Blob URL" },
        { status: 400 }
      );
    }

    const kid = await prisma.user.findUnique({ where: { id: kidId } });
    if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
      return NextResponse.json({ error: "Invalid kid" }, { status: 400 });
    }

    const familyId = session.user.familyId!;
    const parentId = session.user.id;

    const pointEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.pointEntry.create({
        data: {
          familyId,
          kidId,
          points: -points,
          note: trimmedNote,
          photoUrl: url,
          createdById: parentId,
          updatedById: parentId,
        },
      });

      if (url) {
        await tx.photo.create({
          data: {
            familyId,
            kidId,
            photoUrl: url,
            caption: trimmedNote,
            createdById: parentId,
          },
        });
      }

      return entry;
    });

    return NextResponse.json({ pointEntry }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
