#!/usr/bin/env bash
set -euo pipefail

echo "[migration-health] checking supabase migration consistency..."
out="$(supabase migration list 2>&1 || true)"
echo "$out"

if echo "$out" | grep -Eq "Remote migration versions not found|does not match local files|Found local migration files to be inserted before the last migration"; then
  echo "[migration-health] FAIL: migration history mismatch detected."
  exit 1
fi

echo "[migration-health] OK: local and remote migration history look consistent."
