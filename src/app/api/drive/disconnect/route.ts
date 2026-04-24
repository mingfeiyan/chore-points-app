import { NextResponse } from "next/server";
import { PhotoProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

export async function POST() {
  try {
    const session = await requireParentInFamily();
    // Deliberately leaves the user's Drive folder and its files in place.
    // Those are the family's property — disconnecting is a soft unlink on
    // our side, not a destructive operation in their Drive.
    await prisma.family.update({
      where: { id: session.user.familyId! },
      data: {
        photoProvider: PhotoProvider.NONE,
        googleDriveFolderId: null,
        googleDriveConnectedAt: null,
        googleDriveConnectedById: null,
      },
    });
    return NextResponse.json({ ok: true, photoProvider: PhotoProvider.NONE });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
