import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  classifyDriveError,
  downloadFile,
  getFileMetadata,
} from "@/lib/google-drive";

// Clamp to Drive's documented thumbnail max (1600px) and a reasonable floor.
const MIN_THUMB = 64;
const MAX_THUMB = 1600;

// GET /api/drive/file/:id — stream a Drive-hosted photo to the browser.
// Optional ?thumb=<size> returns a 302 to Drive's pre-generated thumbnail,
// which cuts bandwidth ~50× on gallery loads vs. serving the full image.
// Works for any member of the family that owns the photo (parents and
// kids). We use the family's connected-parent OAuth token regardless of
// who is requesting, because kids don't have Google sign-in.
export async function GET(
  req: Request,
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
    const thumbParam = new URL(req.url).searchParams.get("thumb");
    const thumbSize = thumbParam
      ? Math.min(MAX_THUMB, Math.max(MIN_THUMB, parseInt(thumbParam, 10) || 0))
      : null;

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
      if (thumbSize) {
        // Fetch metadata to get a fresh short-lived thumbnailLink. Drive's
        // CDN URL already embeds a default size (e.g. `=s220`) which we
        // overwrite with the caller's requested size. If Drive hasn't
        // generated a thumbnail yet (it can lag a few seconds after
        // upload), fall through to the full-image path below.
        const meta = await getFileMetadata(family.googleDriveConnectedById, driveFileId);
        if (meta.thumbnailLink) {
          const resized = meta.thumbnailLink.replace(/=s\d+(-c)?$/, `=s${thumbSize}`);
          return NextResponse.redirect(resized, {
            status: 302,
            headers: {
              // Shorter than Drive's ~1h URL lifetime so the browser
              // re-requests before the signed URL expires.
              "Cache-Control": "private, max-age=1500",
            },
          });
        }
      }

      const { stream, contentType } = await downloadFile(
        family.googleDriveConnectedById,
        driveFileId
      );
      return new NextResponse(stream, {
        headers: {
          "Content-Type": contentType,
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
