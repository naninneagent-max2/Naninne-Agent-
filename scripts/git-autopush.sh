#!/bin/bash
# Git auto-push script — run after each milestone
# Usage: ./scripts/git-autopush.sh "feat(fase-N): description"

set -e

cd "$(dirname "$0")/.."

MSG="${1:-chore: auto-commit}"

git add -A
git diff --cached --quiet && { echo "No changes to commit"; exit 0; }
git commit -m "$MSG"
git push origin HEAD 2>&1 || echo "⚠️ Push failed — token may not have write permissions"
echo "✅ Done: $MSG"
