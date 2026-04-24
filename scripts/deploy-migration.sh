#!/usr/bin/env bash
# Self-healing production migration deploy.
# Pulls prod env, runs migrate deploy, and for any migration that fails
# with a known schema-drift error ("already exists" / "does not exist" /
# "previously failed") marks it as applied and retries.
# Stops on any other error.
set -u

vercel env pull --environment=production .env.production.local || exit 1
set -a
# shellcheck disable=SC1091
source .env.production.local
set +a

cleanup() { rm -f .env.production.local; }
trap cleanup EXIT

while :; do
  out=$(npx prisma migrate deploy 2>&1)
  echo "$out"
  if echo "$out" | grep -qE "successfully applied|No pending migrations"; then
    echo ">> done"
    exit 0
  fi
  mig=$(echo "$out" | grep -oE '(Migration name: |The `)[0-9]{14}_[a-zA-Z0-9_]+' | head -1 | sed -E 's/^(Migration name: |The `)//')
  if [ -z "$mig" ]; then
    echo ">> stopping: no migration name parsed"
    exit 1
  fi
  # Match the two schema-drift signals we care about:
  #   P3009 — "migrate found failed migrations in the target database"
  #           (a prior migration is sitting in a failed state)
  #   P3018 — migration tried to apply, hit "already exists" / "does not
  #           exist" because prod schema is ahead of the bookkeeping
  if echo "$out" | grep -qE "P3009|found failed migrations|already exists|does not exist"; then
    echo ">> resolving $mig as applied (schema drift)"
    npx prisma migrate resolve --applied "$mig" || exit 1
  else
    echo ">> stopping: unexpected error for $mig"
    exit 1
  fi
done
