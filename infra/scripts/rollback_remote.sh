#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/app/staging}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_ROOT/compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$APP_ROOT/compose.env}"
STATE_DIR="${STATE_DIR:-$APP_ROOT/.deploy-state}"
RELEASE_FILE="${RELEASE_FILE:-$APP_ROOT/release.env}"
SERVICE_NAME="${SERVICE_NAME:-web}"
GIT_SHA="${2:-${GIT_SHA:-unknown}}"

PROBE_SCHEME="${PROBE_SCHEME:-https}"
PROBE_PORT="${PROBE_PORT:-443}"
PROBE_IP="${PROBE_IP:-127.0.0.1}"

ROLLBACK_TAG="${1:-${ROLLBACK_TAG:-}}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_file() {
  [ -f "$1" ] || {
    echo "Missing required file: $1" >&2
    exit 1
  }
}

compose() {
  docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

env_upsert() {
  local key="$1"
  local value="$2"
  local file="$3"
  local tmp
  tmp="$(mktemp)"

  awk -F= -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $1 == key {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$file" > "$tmp"

  cp "$tmp" "$file"
  rm -f "$tmp"
}

write_release_file() {
  local git_sha="$1"
  local image_tag="$2"
  local deployed_at="$3"
  local previous_good_tag="$4"

  cat > "$RELEASE_FILE" <<EOF
RELEASE_GIT_SHA=$git_sha
RELEASE_IMAGE_TAG=$image_tag
RELEASE_DEPLOYED_AT=$deployed_at
RELEASE_PREVIOUS_GOOD_TAG=$previous_good_tag
EOF
}

load_compose_env() {
  set -a
  # shellcheck disable=SC1090
  . "$COMPOSE_ENV_FILE"
  set +a
}

ghcr_login_if_needed() {
  if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
    return
  fi

  echo "[rollback] GHCR_USERNAME / GHCR_TOKEN not set. Assuming package is public or host is already logged in."
}

probe_path() {
  local path="$1"
  curl --fail --silent --show-error \
    --resolve "${STAGING_WEB_HOST}:${PROBE_PORT}:${PROBE_IP}" \
    "${PROBE_SCHEME}://${STAGING_WEB_HOST}${path}" >/dev/null
}

wait_for_probe() {
  local path="$1"
  local attempts="${2:-24}"
  local delay="${3:-5}"
  local i

  for ((i = 1; i <= attempts; i += 1)); do
    if probe_path "$path"; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

require_cmd docker
require_cmd curl
docker info >/dev/null
docker compose version >/dev/null

require_file "$COMPOSE_FILE"
require_file "$COMPOSE_ENV_FILE"
require_file "$STATE_DIR/previous_image_tag"
touch "$RELEASE_FILE"

BACKUP_COMPOSE_ENV="$(mktemp)"
cp "$COMPOSE_ENV_FILE" "$BACKUP_COMPOSE_ENV"
ROLLBACK_FAILED=1

cleanup() {
  if [ "$ROLLBACK_FAILED" -eq 1 ] && [ -f "$BACKUP_COMPOSE_ENV" ]; then
    cp "$BACKUP_COMPOSE_ENV" "$COMPOSE_ENV_FILE"
  fi
  rm -f "$BACKUP_COMPOSE_ENV"
}
trap cleanup EXIT

load_compose_env

if [ -z "${IMAGE_NAME:-}" ]; then
  echo "IMAGE_NAME is missing from $COMPOSE_ENV_FILE" >&2
  exit 1
fi

if [ -z "${STAGING_WEB_HOST:-}" ]; then
  echo "STAGING_WEB_HOST is missing from $COMPOSE_ENV_FILE" >&2
  exit 1
fi

CURRENT_TAG="${IMAGE_TAG:-}"
if [ -z "$ROLLBACK_TAG" ]; then
  ROLLBACK_TAG="$(cat "$STATE_DIR/previous_image_tag")"
fi

if [ -z "$ROLLBACK_TAG" ]; then
  echo "[rollback] no previous known-good tag found" >&2
  exit 1
fi

echo "[rollback] target image: ${IMAGE_NAME}:${ROLLBACK_TAG}"
ghcr_login_if_needed

echo "[rollback] updating compose tag"
env_upsert "IMAGE_TAG" "$ROLLBACK_TAG" "$COMPOSE_ENV_FILE"

echo "[rollback] pulling rollback image"
compose pull "$SERVICE_NAME"

echo "[rollback] recreating service"
compose up -d "$SERVICE_NAME"

echo "[rollback] waiting for boot"
sleep 5

echo "[rollback] probing /api/health"
wait_for_probe "/api/health" 24 5 || {
  echo "[rollback] health check failed" >&2
  exit 1
}

echo "[rollback] probing /api/ready"
wait_for_probe "/api/ready" 24 5 || {
  echo "[rollback] readiness check failed" >&2
  exit 1
}

PREVIOUS_GOOD_TAG="${CURRENT_TAG:-unknown}"

if [ -n "$CURRENT_TAG" ]; then
  printf '%s\n' "$CURRENT_TAG" > "$STATE_DIR/previous_image_tag"
fi
printf '%s\n' "$ROLLBACK_TAG" > "$STATE_DIR/current_image_tag"

write_release_file \
  "rollback" \
  "$ROLLBACK_TAG" \
  "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  "$PREVIOUS_GOOD_TAG"

ROLLBACK_FAILED=0
echo "[rollback] rollback succeeded: ${ROLLBACK_TAG}"