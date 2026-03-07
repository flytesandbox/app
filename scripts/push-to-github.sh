#!/usr/bin/env bash
set -euo pipefail

LOCAL_PATH="${1:-.}"
REMOTE_URL="${2:-https://github.com/flytesandbox/app.git}"
BRANCH="${3:-}"

cd "$LOCAL_PATH"

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

git push -u origin "$BRANCH"
