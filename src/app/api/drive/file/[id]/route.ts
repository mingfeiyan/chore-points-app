import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { classifyDriveError, downloadFile } from "@/lib/google-drive";

// GET /api/drive/file/:id — stream a Drive-hosted photo to the browser.
// Works for any member of the family that owns the photo (parents and
// kids). We use the family's connected-parent OAuth token regardless of
// who is requesting, because kids don't have Google sign-in.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driveFileId } = await params;
    if (!driveFileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await requireFamily();
    const familyId = session.user.familyId!;
    const isKid = session.user.role === "KID";

    // Single query proves four things at once:
    //   1. Photo or PointEntry in this family references this file (authz)
    //   2. If viewer is a KID, it belongs to them (cross-kid filter)
    //   3. The family's Drive connection state (token + folder)
    // PointEntry photos don't have a Photo row of their own — the Award-
    // for-Chore form writes photoUrl straight to the entry — so we also
    // look through PointEntry.photoUrl for the proxy URL.
    const proxyUrl = `/api/drive/file/${driveFileId}`;
    const kidFilter = isKid ? { kidId: session.user.id } : {};
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        photoProvider: true,
        googleDriveConnectedById: true,
        photos: {
          where: { driveFileId, ...kidFilter },
          select: { id: true },
          take: 1,
        },
        pointEntries: {
          where: { photoUrl: proxyUrl, ...kidFilter },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (
      !family ||
      (family.photos.length === 0 && family.pointEntries.length === 0)
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (family.photoProvider !== "GOOGLE_DRIVE" || !family.googleDriveConnectedById) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const { stream, contentType } = await downloadFile(
        family.googleDriveConnectedById,
        driveFileId
      );
      return new NextResponse(stream, {
        headers: {
          "Content-Type": contentType,
          // Private per-user image; browser cache only, no shared/CDN.
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (driveErr) {
      const classified = classifyDriveError(driveErr);
      if (classified) return NextResponse.json(classified.body, { status: classified.status });
      console.error("drive proxy failed", driveErr);
      return NextResponse.json(
        { error: "Couldn't load photo from Drive." },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    console.error("drive proxy error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
