import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { downloadFile } from "@/lib/google-drive";

// GET /api/drive/file/:id — stream a Drive-hosted photo to the browser.
// Works for any member of the family that owns the photo (parents and
// kids). We use the family's connected-parent's OAuth token regardless
// of who is requesting, because kids don't have Google sign-in.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driveFileId } = await params;
    const session = await requireFamily();

    // Authorization: this Drive file must be referenced by a Photo or a
    // PointEntry that belongs to the user's family. Prevents probing.
    const proxyUrl = `/api/drive/file/${driveFileId}`;
    const familyId = session.user.familyId!;
    const [photoHit, pointEntryHit] = await Promise.all([
      prisma.photo.findFirst({
        where: {
          familyId,
          OR: [{ driveFileId }, { photoUrl: proxyUrl }],
        },
        select: { id: true },
      }),
      prisma.pointEntry.findFirst({
        where: { familyId, photoUrl: proxyUrl },
        select: { id: true },
      }),
    ]);
    if (!photoHit && !pointEntryHit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Kids can only see their own photos — cross-kid filter
    if (session.user.role === "KID") {
      const ownPhoto = await prisma.photo.findFirst({
        where: { familyId, kidId: session.user.id, OR: [{ driveFileId }, { photoUrl: proxyUrl }] },
        select: { id: true },
      });
      const ownEntry = await prisma.pointEntry.findFirst({
        where: { familyId, kidId: session.user.id, photoUrl: proxyUrl },
        select: { id: true },
      });
      if (!ownPhoto && !ownEntry) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { googleDriveConnectedById: true, photoProvider: true },
    });
    if (
      !family ||
      family.photoProvider !== "GOOGLE_DRIVE" ||
      !family.googleDriveConnectedById
    ) {
      return NextResponse.json({ error: "Drive not connected" }, { status: 404 });
    }

    const { stream, contentType } = await downloadFile(
      family.googleDriveConnectedById,
      driveFileId
    );
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        // Images are per-user private; don't cache in shared proxies.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
