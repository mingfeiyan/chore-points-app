import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireFamily } from "@/lib/permissions";

// GET /api/photos - Get photos from Photo model + legacy PointEntry photos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.familyId) {
      return NextResponse.json({ error: "No family" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const kidIdParam = searchParams.get("kidId");

    const isParent = session.user.role === "PARENT";

    // Build the where clause for Photo model
    const photoWhereClause: {
      familyId: string;
      kidId?: string;
    } = {
      familyId: session.user.familyId,
    };

    // Build the where clause for legacy PointEntry photos
    const pointEntryWhereClause: {
      familyId: string;
      photoUrl: { not: null };
      kidId?: string;
    } = {
      familyId: session.user.familyId,
      photoUrl: { not: null },
    };

    // Kids can only see their own photos
    if (!isParent) {
      photoWhereClause.kidId = session.user.id;
      pointEntryWhereClause.kidId = session.user.id;
    } else if (kidIdParam) {
      // Parents can filter by kidId
      photoWhereClause.kidId = kidIdParam;
      pointEntryWhereClause.kidId = kidIdParam;
    }

    // Fetch from Photo model
    const photos = await prisma.photo.findMany({
      where: photoWhereClause,
      select: {
        id: true,
        photoUrl: true,
        caption: true,
        date: true,
        createdAt: true,
        kid: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch photos from PointEntry (includes photos attached to point awards)
    const legacyPhotos = await prisma.pointEntry.findMany({
      where: pointEntryWhereClause,
      select: {
        id: true,
        photoUrl: true,
        points: true,
        note: true,
        date: true,
        createdAt: true,
        chore: {
          select: { title: true },
        },
        kid: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Combine and format
    const allPhotos = [
      ...photos.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        caption: p.caption,
        date: p.date,
        createdAt: p.createdAt,
        kid: p.kid,
        points: null,
        chore: null,
      })),
      ...legacyPhotos.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        caption: p.note,
        date: p.date,
        createdAt: p.createdAt,
        kid: p.kid,
        points: p.points,
        chore: p.chore,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ photos: allPhotos });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// POST /api/photos - Create a new photo (without point entry)
export async function POST(request: NextRequest) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can upload photos" },
        { status: 403 }
      );
    }

    const { kidId, photoUrl, caption, date } = await request.json();

    if (!kidId || !photoUrl) {
      return NextResponse.json(
        { error: "kidId and photoUrl are required" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
      return NextResponse.json({ error: "Invalid kid" }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: {
        familyId: session.user.familyId!,
        kidId,
        photoUrl,
        caption: caption || null,
        date: date ? new Date(date + "T12:00:00") : new Date(),
        createdById: session.user.id,
      },
      include: {
        kid: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
