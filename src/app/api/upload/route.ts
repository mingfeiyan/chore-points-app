import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// POST /api/upload - Upload a photo to Vercel Blob
export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();

    // Only families explicitly using VERCEL_BLOB storage may upload here.
    // New families default to photoProvider = NONE until they configure a
    // provider (Google Drive integration is planned); that keeps operator
    // storage costs scoped to families that were explicitly enabled.
    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId! },
      select: { photoProvider: true },
    });
    if (family?.photoProvider !== "VERCEL_BLOB") {
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

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Generate unique filename with family context
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `families/${session.user.familyId}/points/${timestamp}.${extension}`;

    // Upload to Vercel Blob
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

// DELETE /api/upload - Delete a photo from Vercel Blob
export async function DELETE(req: Request) {
  try {
    await requireParentInFamily();

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
