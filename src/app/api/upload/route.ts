import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import { classifyDriveError, uploadFileToFolder } from "@/lib/google-drive";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();

    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId! },
      select: {
        photoProvider: true,
        googleDriveFolderId: true,
        googleDriveConnectedById: true,
      },
    });
    if (!family || family.photoProvider === "NONE") {
      return NextResponse.json(
        { error: "Photo uploads are not enabled for your family." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    if (family.photoProvider === "GOOGLE_DRIVE") {
      if (!family.googleDriveFolderId || !family.googleDriveConnectedById) {
        return NextResponse.json(
          { error: "Google Drive is not fully connected. Please reconnect in settings." },
          { status: 409 }
        );
      }
      const timestamp = Date.now();
      const extension = file.name.split(".").pop() || "jpg";
      const name = `${timestamp}.${extension}`;
      try {
        const uploaded = await uploadFileToFolder(
          family.googleDriveConnectedById,
          family.googleDriveFolderId,
          name,
          file.type,
          file
        );
        return NextResponse.json(
          { url: `/api/drive/file/${uploaded.id}`, driveFileId: uploaded.id },
          { status: 201 }
        );
      } catch (err) {
        const classified = classifyDriveError(err);
        if (classified) return NextResponse.json(classified.body, { status: classified.status });
        return NextResponse.json(
          { error: "Couldn't upload to Google Drive. Please try again." },
          { status: 502 }
        );
      }
    }

    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `families/${session.user.familyId}/points/${timestamp}.${extension}`;

    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    if (errorMessage.includes("Unauthorized") || errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE is Vercel-Blob-only; Drive files stay in the family's Drive.
export async function DELETE(req: Request) {
  try {
    await requireParentInFamily();

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (url.startsWith("/api/drive/file/")) {
      return NextResponse.json(
        { error: "Drive-hosted photos must be deleted from your Drive." },
        { status: 400 }
      );
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
