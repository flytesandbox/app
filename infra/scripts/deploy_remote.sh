#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/app/staging}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_ROOT/compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$APP_ROOT/compose.env}"
DEFAULT_RUNTIME_ENV_FILE="${DEFAULT_RUNTIME_ENV_FILE:-$APP_ROOT/.env}"
STATE_DIR="${STATE_DIR:-$APP_ROOT/.deploy-state}"
RELEASE_FILE="${RELEASE_FILE:-$APP_ROOT/release.env}"
SERVICE_NAME="${SERVICE_NAME:-web}"
TARGET_TAG="${1:-${TARGET_TAG:-}}"
GIT_SHA="${2:-${GIT_SHA:-unknown}}"

PROBE_SCHEME="${PROBE_SCHEME:-https}"
PROBE_PORT="${PROBE_PORT:-443}"
PROBE_IP="${PROBE_IP:-127.0.0.1}"
PROBE_CONNECT_TIMEOUT="${PROBE_CONNECT_TIMEOUT:-5}"
PROBE_MAX_TIME="${PROBE_MAX_TIME:-10}"
CONTAINER_HEALTH_ATTEMPTS="${CONTAINER_HEALTH_ATTEMPTS:-24}"
CONTAINER_HEALTH_DELAY="${CONTAINER_HEALTH_DELAY:-5}"
INGRESS_PROBE_ATTEMPTS="${INGRESS_PROBE_ATTEMPTS:-24}"
INGRESS_PROBE_DELAY="${INGRESS_PROBE_DELAY:-5}"
LAST_PROBE_ERROR=""
LEGACY_SERVICE_CONTAINER_NAME="${LEGACY_SERVICE_CONTAINER_NAME:-app-staging-web}"

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
  docker compose --project-directory "$APP_ROOT" -f "$COMPOSE_FILE" "$@"
}

env_get() {
  local key="$1"
  local file="$2"
  awk -F= -v key="$key" '$1 == key { print substr($0, length($1) + 2); exit }' "$file"
}

parse_boolean() {
  local name="$1"
  local value="${2:-}"
  local normalized
  normalized="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  case "$normalized" in
    1|true|yes|on)
      printf 'true'
      ;;
    0|false|no|off|'')
      printf 'false'
      ;;
    *)
      echo "[deploy] $name must be one of: 1, true, yes, on, 0, false, no, off" >&2
      exit 1
      ;;
  esac
}

trim_env_value() {
  local value="${1:-}"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

require_runtime_env() {
  local name="$1"
  local value

  value="$(trim_env_value "$(env_get "$name" "$RUNTIME_ENV_FILE")")"
  if [ -z "$value" ]; then
    echo "[deploy] Missing required runtime env value: $name" >&2
    exit 1
  fi

  printf '%s' "$value"
}

reject_wrapping_quotes() {
  local name="$1"
  local value="$2"

  case "$value" in
    \"*\"|\'*\')
      echo "[deploy] $name must be stored without wrapping quotes. Paste the raw value only." >&2
      exit 1
      ;;
  esac
}

validate_http_url() {
  local name="$1"
  local value="$2"

  reject_wrapping_quotes "$name" "$value"

  case "$value" in
    http://*|https://*)
      ;;
    *)
      echo "[deploy] $name must use http:// or https://" >&2
      exit 1
      ;;
  esac
}

validate_staging_origin() {
  local name="$1"
  local value="$2"
  local expected_host="$3"

  validate_http_url "$name" "$value"

  case "$value" in
    "https://${expected_host}"|"https://${expected_host}/")
      ;;
    *)
      echo "[deploy] $name must be the staging origin https://${expected_host}" >&2
      exit 1
      ;;
  esac
}

validate_clerk_publishable_key() {
  local value="$1"

  reject_wrapping_quotes "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "$value"

  case "$value" in
    pk_test_*|pk_live_*)
      ;;
    *)
      echo "[deploy] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_. Update staging with the real Clerk publishable key and remove any wrapping quotes." >&2
      exit 1
      ;;
  esac
}

validate_clerk_secret_key() {
  local value="$1"

  reject_wrapping_quotes "CLERK_SECRET_KEY" "$value"

  case "$value" in
    sk_test_*|sk_live_*)
      ;;
    *)
      echo "[deploy] CLERK_SECRET_KEY must start with sk_test_ or sk_live_. Update staging with the real Clerk secret key and remove any wrapping quotes." >&2
      exit 1
      ;;
  esac
}

clerk_key_family() {
  local value="$1"

  case "$value" in
    *_test_*)
      printf 'test'
      ;;
    *_live_*)
      printf 'live'
      ;;
    *)
      printf 'unknown'
      ;;
  esac
}

validate_authorized_parties() {
  local value="$1"
  local required_origin="$2"
  local found_any=0
  local found_required=0
  local part

  IFS=',' read -r -a parts <<< "$value"
  for part in "${parts[@]}"; do
    part="$(trim_env_value "$part")"
    if [ -z "$part" ]; then
      continue
    fi

    found_any=1
    validate_staging_origin "CLERK_AUTHORIZED_PARTIES" "$part" "$STAGING_WEB_HOST"
    if [ "$part" = "$required_origin" ]; then
      found_required=1
    fi
  done

  if [ "$found_any" -ne 1 ]; then
    echo "[deploy] CLERK_AUTHORIZED_PARTIES must contain at least one origin" >&2
    exit 1
  fi

  if [ "$found_required" -ne 1 ]; then
    echo "[deploy] CLERK_AUTHORIZED_PARTIES must include NEXT_PUBLIC_APP_URL ($required_origin)" >&2
    exit 1
  fi
}

validate_jwt_public_key() {
  local value="$1"

  if [[ "$value" != *"BEGIN PUBLIC KEY"* ]]; then
    echo "[deploy] CLERK_JWT_KEY must contain a PEM public key. Copy the full Clerk JWT public key including the BEGIN/END lines." >&2
    exit 1
  fi
}

validate_runtime_env_contract() {
  local next_public_app_url
  local clerk_authorized_parties
  local clerk_publishable_key
  local clerk_secret_key
  local clerk_jwt_key

  next_public_app_url="$(require_runtime_env "NEXT_PUBLIC_APP_URL")"
  validate_staging_origin "NEXT_PUBLIC_APP_URL" "$next_public_app_url" "$STAGING_WEB_HOST"

  clerk_authorized_parties="$(require_runtime_env "CLERK_AUTHORIZED_PARTIES")"
  validate_authorized_parties "$clerk_authorized_parties" "$next_public_app_url"

  clerk_publishable_key="$(require_runtime_env "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")"
  validate_clerk_publishable_key "$clerk_publishable_key"

  clerk_secret_key="$(require_runtime_env "CLERK_SECRET_KEY")"
  validate_clerk_secret_key "$clerk_secret_key"

  if [ "$(clerk_key_family "$clerk_publishable_key")" != "$(clerk_key_family "$clerk_secret_key")" ]; then
    echo "[deploy] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must both be test keys or both be live keys. Copy both values from the same staging Clerk app." >&2
    exit 1
  fi

  clerk_jwt_key="$(require_runtime_env "CLERK_JWT_KEY")"
  validate_jwt_public_key "$clerk_jwt_key"
}

validate_staging_mysql_url() {
  local name="$1"
  local value="$2"

  reject_wrapping_quotes "$name" "$value"

  case "$value" in
    mysql://*)
      ;;
    *)
      echo "[deploy] $name must use mysql://" >&2
      exit 1
      ;;
  esac

  case "$value" in
    *"@127.0.0.1"*|*"@localhost"*|*"@::1"*|*"@host.docker.internal"*|*"@0."*)
      echo "[deploy] $name must not use a local-only database host in staging" >&2
      exit 1
      ;;
  esac

  case "$value" in
    */app_staging|*/app_staging\?*)
      ;;
    *)
      echo "[deploy] $name must target the app_staging database" >&2
      exit 1
      ;;
  esac
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

sync_runtime_release_env() {
  local git_sha="$1"
  local image_tag="$2"
  local deployed_at="$3"
  local previous_good_tag="$4"

  env_upsert "RELEASE_GIT_SHA" "$git_sha" "$RUNTIME_ENV_FILE"
  env_upsert "RELEASE_IMAGE_TAG" "$image_tag" "$RUNTIME_ENV_FILE"
  env_upsert "RELEASE_DEPLOYED_AT" "$deployed_at" "$RUNTIME_ENV_FILE"
  env_upsert "RELEASE_PREVIOUS_GOOD_TAG" "$previous_good_tag" "$RUNTIME_ENV_FILE"
}

load_compose_env() {
  set -a
  # shellcheck disable=SC1090
  . "$COMPOSE_ENV_FILE"
  set +a
}

validate_probe_ip() {
  local value="${1:-}"

  if [ -z "$value" ]; then
    return 0
  fi

  case "$value" in
    0.*)
      echo "[deploy] PROBE_IP must not use 0.0.0.0/8. Unset it to use the default 127.0.0.1 or set the actual ingress listener IP." >&2
      exit 1
      ;;
  esac
}

log_probe_configuration() {
  local resolved_ip="${PROBE_IP:-dns}"
  echo "[deploy] ingress probe target: ${PROBE_SCHEME}://${STAGING_WEB_HOST}:${PROBE_PORT} via ${resolved_ip}" >&2
}

validate_staging_runtime_boundary() {
  local database_enabled="$1"
  local app_env
  local db_ssl_required

  app_env="$(require_runtime_env "APP_ENV")"
  if [ "$app_env" != "staging" ]; then
    echo "[deploy] APP_ENV must equal staging for the staging deploy rail" >&2
    exit 1
  fi

  if [ "$APP_ROOT" != "/app/staging" ]; then
    echo "[deploy] APP_ROOT must remain /app/staging for the staging deploy rail" >&2
    exit 1
  fi

  if [ "$STAGING_WEB_HOST" != "staging.mecplans101.com" ]; then
    echo "[deploy] STAGING_WEB_HOST must equal staging.mecplans101.com" >&2
    exit 1
  fi

  if [ "$database_enabled" = "true" ]; then
    db_ssl_required="$(parse_boolean "DB_SSL_REQUIRED" "$(env_get "DB_SSL_REQUIRED" "$RUNTIME_ENV_FILE")")"
    if [ "$db_ssl_required" != "true" ]; then
      echo "[deploy] DB_SSL_REQUIRED must be true when DATABASE_ENABLED=true in staging" >&2
      exit 1
    fi

    validate_staging_mysql_url "DATABASE_URL" "$(require_runtime_env "DATABASE_URL")"
    validate_staging_mysql_url "DATABASE_MIGRATION_URL" "$(require_runtime_env "DATABASE_MIGRATION_URL")"
  fi
}

resolve_app_root_path() {
  local path="$1"

  case "$path" in
    /*)
      printf '%s\n' "$path"
      ;;
    ./*)
      printf '%s/%s\n' "$APP_ROOT" "${path#./}"
      ;;
    *)
      printf '%s/%s\n' "$APP_ROOT" "$path"
      ;;
  esac
}

resolve_runtime_env_file() {
  local configured_runtime_env_file="${APP_RUNTIME_ENV_FILE:-$DEFAULT_RUNTIME_ENV_FILE}"
  RUNTIME_ENV_FILE="$(resolve_app_root_path "$configured_runtime_env_file")"
  require_file "$RUNTIME_ENV_FILE"
}

ghcr_login_if_needed() {
  if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
    return
  fi

  echo "[deploy] GHCR_USERNAME / GHCR_TOKEN not set. Assuming package is public or host is already logged in."
}

probe_path() {
  local path="$1"
  local url="${PROBE_SCHEME}://${STAGING_WEB_HOST}${path}"
  local -a curl_args=(
    --fail
    --silent
    --show-error
    --output /dev/null
    --connect-timeout "$PROBE_CONNECT_TIMEOUT"
    --max-time "$PROBE_MAX_TIME"
  )

  if [ -n "${PROBE_IP:-}" ]; then
    curl_args+=(--resolve "${STAGING_WEB_HOST}:${PROBE_PORT}:${PROBE_IP}")
  fi

  if LAST_PROBE_ERROR="$(curl "${curl_args[@]}" "$url" 2>&1)"; then
    LAST_PROBE_ERROR=""
    return 0
  fi

  return 1
}

get_service_container_id() {
  compose ps -q "$SERVICE_NAME" | head -n 1
}

get_container_id_by_name() {
  local name="$1"
  docker container inspect --format '{{.Id}}' "$name" 2>/dev/null || true
}

remove_legacy_service_container_conflict() {
  local legacy_container_id
  local active_container_id

  legacy_container_id="$(get_container_id_by_name "$LEGACY_SERVICE_CONTAINER_NAME")"
  if [ -z "$legacy_container_id" ]; then
    return 0
  fi

  active_container_id="$(get_service_container_id)"
  if [ -n "$active_container_id" ] && [ "$active_container_id" = "$legacy_container_id" ]; then
    echo "[deploy] removing legacy fixed-name container ${LEGACY_SERVICE_CONTAINER_NAME} before compose-managed recreate" >&2
  else
    echo "[deploy] removing conflicting legacy container ${LEGACY_SERVICE_CONTAINER_NAME}" >&2
  fi

  docker rm -f "$LEGACY_SERVICE_CONTAINER_NAME" >/dev/null
}

service_health_status() {
  local container_id="$1"
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id"
}

print_service_diagnostics() {
  local container_id="${1:-}"

  echo "[deploy] docker compose ps" >&2
  compose ps "$SERVICE_NAME" >&2 || true

  if [ -n "$container_id" ]; then
    echo "[deploy] container state" >&2
    docker inspect --format 'status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} exit={{.State.ExitCode}} started={{.State.StartedAt}} finished={{.State.FinishedAt}}' "$container_id" >&2 || true
  fi

  echo "[deploy] recent service logs" >&2
  compose logs --tail=40 "$SERVICE_NAME" >&2 || true
}

wait_for_service_health() {
  local attempts="${1:-$CONTAINER_HEALTH_ATTEMPTS}"
  local delay="${2:-$CONTAINER_HEALTH_DELAY}"
  local i
  local container_id
  local status

  for ((i = 1; i <= attempts; i += 1)); do
    container_id="$(get_service_container_id)"

    if [ -z "$container_id" ]; then
      echo "[deploy] waiting for service container id (${i}/${attempts})" >&2
      sleep "$delay"
      continue
    fi

    status="$(service_health_status "$container_id" 2>/dev/null || true)"
    case "$status" in
      healthy|running)
        return 0
        ;;
      unhealthy|exited|dead)
        echo "[deploy] service state is ${status:-unknown}" >&2
        print_service_diagnostics "$container_id"
        return 1
        ;;
      *)
        echo "[deploy] service state is ${status:-unknown} (${i}/${attempts})" >&2
        ;;
    esac

    sleep "$delay"
  done

  print_service_diagnostics "$(get_service_container_id)"
  return 1
}

wait_for_probe() {
  local path="$1"
  local attempts="${2:-$INGRESS_PROBE_ATTEMPTS}"
  local delay="${3:-$INGRESS_PROBE_DELAY}"
  local i

  for ((i = 1; i <= attempts; i += 1)); do
    if probe_path "$path"; then
      return 0
    fi
    echo "[deploy] probe attempt ${i}/${attempts} failed for ${path}: ${LAST_PROBE_ERROR:-curl exited with a non-zero status}" >&2
    sleep "$delay"
  done

  print_service_diagnostics "$(get_service_container_id)"
  return 1
}

if [ -z "$TARGET_TAG" ]; then
  echo "Usage: $0 <image-tag>" >&2
  exit 64
fi

require_cmd docker
require_cmd curl
docker info >/dev/null
docker compose version >/dev/null

require_file "$COMPOSE_FILE"
require_file "$COMPOSE_ENV_FILE"

mkdir -p "$STATE_DIR"
touch "$RELEASE_FILE"

BACKUP_COMPOSE_ENV="$(mktemp)"
cp "$COMPOSE_ENV_FILE" "$BACKUP_COMPOSE_ENV"
DEPLOY_FAILED=1
SERVICE_RECREATED=0

cleanup() {
  if [ "$DEPLOY_FAILED" -eq 1 ] && [ -f "$BACKUP_COMPOSE_ENV" ]; then
    cp "$BACKUP_COMPOSE_ENV" "$COMPOSE_ENV_FILE"
    load_compose_env
    resolve_runtime_env_file

    if [ "$SERVICE_RECREATED" -eq 1 ]; then
      echo "[deploy] restoring previous service after failed deploy" >&2
      if ! compose up -d "$SERVICE_NAME" >/dev/null 2>&1; then
        echo "[deploy] automatic service restore failed; manual rollback may be required" >&2
      fi
    fi
  fi

  rm -f "$BACKUP_COMPOSE_ENV"
}
trap 'rc=$?; trap - EXIT; cleanup "$rc"; exit "$rc"' EXIT

load_compose_env
resolve_runtime_env_file
validate_runtime_env_contract
DATABASE_ENABLED="$(parse_boolean "DATABASE_ENABLED" "$(env_get "DATABASE_ENABLED" "$RUNTIME_ENV_FILE")")"
validate_staging_runtime_boundary "$DATABASE_ENABLED"

CURRENT_TAG="${IMAGE_TAG:-}"
if [ -z "${IMAGE_NAME:-}" ]; then
  echo "IMAGE_NAME is missing from $COMPOSE_ENV_FILE" >&2
  exit 1
fi

if [ -z "${STAGING_WEB_HOST:-}" ]; then
  echo "STAGING_WEB_HOST is missing from $COMPOSE_ENV_FILE" >&2
  exit 1
fi

validate_probe_ip "${PROBE_IP:-}"
log_probe_configuration

echo "[deploy] target image: ${IMAGE_NAME}:${TARGET_TAG}"
ghcr_login_if_needed

echo "[deploy] updating compose tag"
env_upsert "IMAGE_TAG" "$TARGET_TAG" "$COMPOSE_ENV_FILE"
IMAGE_TAG="$TARGET_TAG"
export IMAGE_TAG

echo "[deploy] pulling target image"
compose pull "$SERVICE_NAME"

if [ "$DATABASE_ENABLED" = "true" ]; then
  echo "[deploy] running explicit migration step"
  docker run --rm --env-file "$RUNTIME_ENV_FILE" "${IMAGE_NAME}:${TARGET_TAG}" node ./scripts/db-migrate.mjs
else
  echo "[deploy] DATABASE_ENABLED=false; skipping explicit migration step"
fi

echo "[deploy] recreating service"
remove_legacy_service_container_conflict
compose up -d --remove-orphans "$SERVICE_NAME"
SERVICE_RECREATED=1

echo "[deploy] waiting for container health"
wait_for_service_health || {
  echo "[deploy] container health check failed" >&2
  exit 1
}

echo "[deploy] probing /api/health through ingress"
wait_for_probe "/api/health" || {
  echo "[deploy] health check failed through ingress" >&2
  exit 1
}

echo "[deploy] probing /api/ready through ingress"
wait_for_probe "/api/ready" || {
  echo "[deploy] readiness check failed through ingress" >&2
  exit 1
}

PREVIOUS_GOOD_TAG="${CURRENT_TAG:-unknown}"

if [ -n "$CURRENT_TAG" ]; then
  printf '%s\n' "$CURRENT_TAG" > "$STATE_DIR/previous_image_tag"
fi
printf '%s\n' "$TARGET_TAG" > "$STATE_DIR/current_image_tag"

DEPLOYED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

write_release_file \
  "$GIT_SHA" \
  "$TARGET_TAG" \
  "$DEPLOYED_AT" \
  "$PREVIOUS_GOOD_TAG"
sync_runtime_release_env \
  "$GIT_SHA" \
  "$TARGET_TAG" \
  "$DEPLOYED_AT" \
  "$PREVIOUS_GOOD_TAG"

DEPLOY_FAILED=0
echo "[deploy] deploy succeeded: ${TARGET_TAG}"
