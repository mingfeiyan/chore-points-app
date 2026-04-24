import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import { classifyDriveError, findOrCreateFolder } from "@/lib/google-drive";

export async function POST() {
  try {
    const session = await requireParentInFamily();

    // Users whose Google Account record predates the Drive scope expansion
    // need to re-consent before we can call the Drive API.
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
    });
    if (!account) {
      return NextResponse.json(
        { error: "No Google account linked. Sign in with Google first." },
        { status: 409 }
      );
    }
    if (!account.scope?.includes("drive.file")) {
      return NextResponse.json({ needsReauthorize: true }, { status: 409 });
    }

    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId! },
    });
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // If another parent already owns the connection, refuse silently
    // overwriting them — that parent's Drive holds existing photos and
    // switching owners would orphan the OAuth token the proxy needs.
    if (
      family.googleDriveConnectedById &&
      family.googleDriveConnectedById !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Google Drive is already connected by another parent. They should disconnect first.",
        },
        { status: 409 }
      );
    }

    // Drive folder names are plain strings; hyphen keeps the brand prefix
    // readable in the Drive UI (a slash would look like a sub-path).
    const folderName = `GemSteps - ${family.name}`;
    let folderId: string;
    try {
      folderId = await findOrCreateFolder(session.user.id, folderName);
    } catch (driveErr: unknown) {
      const classified = classifyDriveError(driveErr);
      if (classified) return NextResponse.json(classified.body, { status: classified.status });
      return NextResponse.json(
        { error: "Couldn't reach Google Drive. Please try again in a moment." },
        { status: 502 }
      );
    }

    await prisma.family.update({
      where: { id: family.id },
      data: {
        photoProvider: "GOOGLE_DRIVE",
        googleDriveFolderId: folderId,
        googleDriveConnectedAt: new Date(),
        googleDriveConnectedById: session.user.id,
      },
    });

    return NextResponse.json({
      folderId,
      folderName,
      photoProvider: "GOOGLE_DRIVE",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
