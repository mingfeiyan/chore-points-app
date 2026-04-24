/**
 * One-shot migrator: moves a family's existing Vercel Blob photos into
 * their connected Google Drive folder and rewrites Photo / PointEntry
 * rows to point at the Drive proxy URL.
 *
 * Usage (run locally with production env loaded):
 *   npx tsx scripts/migrate-blob-to-drive.ts <familyId>
 *   npx tsx scripts/migrate-blob-to-drive.ts <familyId> --dry-run
 *   npx tsx scripts/migrate-blob-to-drive.ts <familyId> --delete-blob
 *
 * Typical flow:
 *   1. Run with no flags — copies blobs into Drive and updates DB.
 *      Blobs are left in place so you can verify images render.
 *   2. Once verified in the UI, re-run with --delete-blob to actually
 *      free the storage.
 *
 * Idempotent: rows whose photoUrl is already a /api/drive/… proxy URL
 * are skipped.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { uploadFileToFolder } from "../src/lib/google-drive";

const prisma = new PrismaClient();

interface FamilyContext {
  id: string;
  googleDriveFolderId: string;
  googleDriveConnectedById: string;
}

async function migrateOne(
  family: FamilyContext,
  blobUrl: string,
  baseName: string
): Promise<string> {
  const res = await fetch(blobUrl);
  if (!res.ok) {
    throw new Error(`download ${res.status} ${res.statusText} from ${blobUrl}`);
  }
  const blob = await res.blob();
  const mimeType = blob.type || res.headers.get("content-type") || "image/jpeg";
  const extFromMime = mimeType.split("/")[1]?.split(";")[0] || "jpg";
  const uploaded = await uploadFileToFolder(
    family.googleDriveConnectedById,
    family.googleDriveFolderId,
    `${baseName}.${extFromMime}`,
    mimeType,
    blob
  );
  return uploaded.id;
}

async function listFamilies() {
  const fams = await prisma.family.findMany({
    select: {
      id: true,
      name: true,
      photoProvider: true,
      googleDriveFolderId: true,
    },
    orderBy: { createdAt: "asc" },
  });
  for (const f of fams) {
    const [photoBlobs, entryBlobs] = await Promise.all([
      prisma.photo.count({
        where: {
          familyId: f.id,
          NOT: { photoUrl: { startsWith: "/api/drive/" } },
        },
      }),
      prisma.pointEntry.count({
        where: {
          familyId: f.id,
          photoUrl: { not: null },
          NOT: { photoUrl: { startsWith: "/api/drive/" } },
        },
      }),
    ]);
    const connected = f.googleDriveFolderId ? "drive✓" : "drive✗";
    console.log(
      `  ${f.id}  ${f.name.padEnd(24)}  ${f.photoProvider.padEnd(12)}  ${connected}  blob-photos=${photoBlobs}  blob-entries=${entryBlobs}`
    );
  }
}

async function main() {
  if (process.argv.includes("--list")) {
    await listFamilies();
    return;
  }

  const familyId = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  const deleteBlob = process.argv.includes("--delete-blob");

  if (!familyId || familyId.startsWith("--")) {
    console.error(
      "Usage: npx tsx scripts/migrate-blob-to-drive.ts <familyId> [--dry-run] [--delete-blob]\n" +
        "       npx tsx scripts/migrate-blob-to-drive.ts --list"
    );
    process.exit(1);
  }

  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error(`Family ${familyId} not found`);
  if (!family.googleDriveFolderId || !family.googleDriveConnectedById) {
    throw new Error(
      `Family ${familyId} is not connected to Google Drive. Connect in settings first.`
    );
  }

  const ctx: FamilyContext = {
    id: family.id,
    googleDriveFolderId: family.googleDriveFolderId,
    googleDriveConnectedById: family.googleDriveConnectedById,
  };

  const photos = await prisma.photo.findMany({
    where: {
      familyId,
      NOT: { photoUrl: { startsWith: "/api/drive/" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const entries = await prisma.pointEntry.findMany({
    where: {
      familyId,
      photoUrl: { not: null },
      NOT: { photoUrl: { startsWith: "/api/drive/" } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Family ${family.name} (${familyId})`);
  console.log(`  ${photos.length} Photo rows with Blob URLs`);
  console.log(`  ${entries.length} PointEntry rows with Blob URLs`);
  console.log(`  Drive folder: ${family.googleDriveFolderId}`);
  console.log(`  Flags: dry-run=${dryRun}, delete-blob=${deleteBlob}`);

  if (photos.length + entries.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }
  if (dryRun) {
    console.log("(dry run — no writes)");
    return;
  }

  let success = 0;
  let failed = 0;
  const migratedBlobUrls: string[] = [];

  for (const photo of photos) {
    try {
      const driveId = await migrateOne(ctx, photo.photoUrl, `photo-${photo.id}`);
      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          photoUrl: `/api/drive/file/${driveId}`,
          driveFileId: driveId,
        },
      });
      migratedBlobUrls.push(photo.photoUrl);
      success++;
      console.log(`  ✓ photo ${photo.id} → ${driveId}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ photo ${photo.id}:`, err instanceof Error ? err.message : err);
    }
  }

  for (const entry of entries) {
    if (!entry.photoUrl) continue;
    try {
      const driveId = await migrateOne(ctx, entry.photoUrl, `entry-${entry.id}`);
      await prisma.pointEntry.update({
        where: { id: entry.id },
        data: { photoUrl: `/api/drive/file/${driveId}` },
      });
      migratedBlobUrls.push(entry.photoUrl);
      success++;
      console.log(`  ✓ entry ${entry.id} → ${driveId}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ entry ${entry.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nMigration: ${success} succeeded, ${failed} failed`);

  if (deleteBlob && migratedBlobUrls.length > 0) {
    const { del } = await import("@vercel/blob");
    let deleted = 0;
    for (const url of migratedBlobUrls) {
      try {
        await del(url);
        deleted++;
      } catch (err) {
        console.warn(`  ! delete ${url}:`, err instanceof Error ? err.message : err);
      }
    }
    console.log(`Deleted ${deleted}/${migratedBlobUrls.length} Blob objects`);
  } else if (migratedBlobUrls.length > 0) {
    console.log(
      `\nBlob storage still holds ${migratedBlobUrls.length} old objects. After verifying images render, re-run with --delete-blob to free storage.`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
