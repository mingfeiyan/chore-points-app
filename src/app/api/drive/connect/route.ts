import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import { findOrCreateFolder } from "@/lib/google-drive";

export async function POST() {
  try {
    const session = await requireParentInFamily();

    // The existing Google OAuth was only requesting the `calendar` scope
    // until Phase 2a — users whose Account record predates the scope
    // expansion need to re-consent before we can call the Drive API.
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

    // Drive folder names can contain any string, but slashes render
    // confusingly in the Drive UI. Hyphen keeps the brand prefix clear.
    const folderName = `GemSteps - ${family.name}`;
    const folderId = await findOrCreateFolder(session.user.id, folderName);

    await prisma.family.update({
      where: { id: family.id },
      data: {
        photoProvider: "GOOGLE_DRIVE",
        googleDriveFolderId: folderId,
        googleDriveConnectedAt: new Date(),
      },
    });

    return NextResponse.json({ folderId, folderName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
