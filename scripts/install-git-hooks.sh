#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"
git config --local core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push scripts/run-staged-guard.js scripts/run-pre-push-guard.js scripts/install-git-hooks.sh
printf 'Git hooks installed at %s/.githooks\n' "$repo_root"
