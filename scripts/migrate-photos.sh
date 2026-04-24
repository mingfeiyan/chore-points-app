#!/usr/bin/env bash
# One-command Vercel Blob → Google Drive photo migration.
# Walks through: env-pull, family selection, dry-run preview, migration,
# UI-verification pause, and blob deletion. Cleans up automatically.
set -eu

echo "┌─ GemSteps photo migrator"
echo "│"

if ! command -v vercel >/dev/null 2>&1; then
  echo "│  vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi
if ! vercel whoami >/dev/null 2>&1; then
  echo "│  Not logged in to Vercel. Run: vercel login"
  exit 1
fi

echo "│  Pulling production env..."
vercel env pull --environment=production .env.production.local >/dev/null
trap "rm -f .env.production.local" EXIT

set -a
# shellcheck disable=SC1091
source .env.production.local
set +a

echo "│"
echo "│  Families:"
echo "│"
npx tsx scripts/migrate-blob-to-drive.ts --list
echo "│"

read -rp "│  Family ID to migrate: " FAMILY_ID
if [ -z "$FAMILY_ID" ]; then
  echo "│  No ID entered — aborting."
  exit 1
fi

echo "│"
echo "├─ Step 1: Dry run"
echo "│"
npx tsx scripts/migrate-blob-to-drive.ts "$FAMILY_ID" --dry-run

echo "│"
read -rp "│  Proceed with migration? Blob files will be kept as a safety net until step 3. [y/N] " CONFIRM
case "$CONFIRM" in
  [yY]*) ;;
  *) echo "│  Aborted."; exit 0 ;;
esac

echo "│"
echo "├─ Step 2: Migrating (downloading from Blob, uploading to Drive, updating DB)"
echo "│"
npx tsx scripts/migrate-blob-to-drive.ts "$FAMILY_ID"

echo "│"
echo "│  Verify images render in the UI — try /gallery and /ledger."
echo "│  If anything is broken, STOP HERE. The old Blob files are still available."
echo "│"
read -rp "│  Delete the old Blob files to free storage? [y/N] " DELETE_CONFIRM
case "$DELETE_CONFIRM" in
  [yY]*) ;;
  *)
    echo "│  Blobs kept. Re-run this script later to clean them up when ready."
    exit 0
    ;;
esac

echo "│"
echo "├─ Step 3: Deleting Blob objects"
echo "│"
npx tsx scripts/migrate-blob-to-drive.ts "$FAMILY_ID" --delete-blob

echo "│"
echo "└─ Done."
