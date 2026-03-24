# Phase 8 Observability Map

Status: complete
Date: 2026-03-24

## Purpose

Define the concrete observability and auditability surfaces that now exist in the repo so operators can tell which evidence lives where, how it is correlated, and which gaps still remain open. References to the current deployable app target this build's repo state and do not canonize a general repo-placement policy.

## Correlation Contract

### Edge and request correlation

- `web/proxy.ts` now accepts an incoming `X-Request-Id` when present or generates one when absent.
- the proxy now forwards the request ID downstream on request headers for the broader app request surface.
- the proxy now returns `X-Request-Id` on pass-through responses and on Clerk redirect/error responses that surface through the middleware boundary.

### API request correlation

- current API route handlers accept the propagated request ID through the shared observed-route helper.
- current API responses return `X-Request-Id`.
- current API JSON responses also include `requestId` in the body for fast operator correlation.
- API log lines for observed routes include:
  - `requestId`
  - `routeId`
  - HTTP method
  - request path
  - request duration
  - final status

### Route identifiers

- API route logs use stable route IDs instead of only file paths or free-form messages.
- current route IDs covered in Phase 8:
  - `api.health.get`
  - `api.ready.get`
  - `api.release.get`
  - `api.auth-check.get`
  - `api.private.application.get`
  - `api.private.me.get`
  - `api.private.tenant-check.get`
  - `api.private.admin.applications.get`
  - `api.private.admin.status-change.post`
  - `api.private.admin.audit-events.get`

## Shell/API Log Surfaces

### Structured API logs

- `web/lib/observability/http.ts` owns request start, completion, and unhandled-error log shape for current API routes.
- log events currently include:
  - `http.request.start`
  - `http.request.complete`
  - `http.request.unhandled_error`
- structured route logs now also include sanitized release/app fields:
  - `service`
  - `appEnv`
  - `imageName`
  - `releaseGitSha`
  - `releaseImageTag`
  - `releaseDeployedAt`
  - `releasePreviousGoodTag`

### Route-specific events

- readiness route emits:
  - `readiness.env_validation_failed`
  - `readiness.database_skipped`
  - `readiness.database_not_ready`
- auth check route emits:
  - `auth-check.unauthenticated`
- audit write/query surfaces emit:
  - `audit.write.skipped`
  - `audit.write.succeeded`
  - `audit.query.skipped`

### Release visibility surfaces

- `GET /api/release` provides a minimal app-side release metadata surface.
- `GET /api/health` includes sanitized release metadata with basic liveness status.
- `GET /api/ready` includes sanitized release metadata with readiness state and current DB check outcome.

### Redaction rules

- structured route logs must not include:
  - secret values
  - raw tokens
  - raw authorization headers
  - full request bodies
  - PHI-bearing payloads
  - full DB URLs
- error logging remains limited to error name and message rather than full stack/body dumps.
- release visibility surfaces expose only sanitized deploy metadata, not secrets or raw infrastructure internals.

## Audit Evidence Surfaces

### Database record

- `audit_events` remains the canonical audit table.
- canonical columns already present:
  - `tenant_id`
  - `actor_user_id`
  - `actor_role`
  - `event_type`
  - `resource_type`
  - `resource_id`
  - `metadata_json`
  - `created_at`

### Repo-owned audit helper

- `web/lib/audit/events.ts` provides:
  - `writeAuditEvent(...)`
  - `listRecentAuditEvents(...)`
- metadata is trimmed and JSON-sanitized before insert so the helper does not become a raw payload dump.

### Current proof write path

- `POST /api/private/admin/status-change` attempts to write `application.status_change_requested`.
- the route records:
  - actor identity from the current authz context
  - resource type `application`
  - optional `applicationId`
  - request correlation metadata including `requestId` and `routeId`
- if `DATABASE_ENABLED=false`, the route returns `audit: skipped` rather than inventing a database write result.

### Current proof query path

- `GET /api/private/admin/audit-events` provides a minimal operator/admin query surface.
- permission rail:
  - internal role required
  - `audit:view` permission required
- when the DB rail is disabled, the route returns a clear `AUDIT_DB_DISABLED` response instead of pretending audit history is available.

## Operator and Deploy Evidence

### Rebuild operator trail

- `docs/rebuild-log/current.md` remains the active operator rebuild/deploy/recovery stream.
- `docs/rebuild-log/tools/append-entry.ps1` remains the canonical append helper.
- `docs/rebuild-log/tools/archive-current.ps1` now provides the archive/reset lifecycle tool for closed streams.
- this logging path remains intentionally docs-only and stays outside the deployed app surface.

### Deploy and release evidence

- the staging deploy workflow writes runtime env, compose env, and release metadata under `.deploy/staging/`.
- release metadata now exists in both `release.env` and the runtime `.env` consumed by the app.
- remote deploy and rollback scripts keep runtime `.env` release keys aligned with the latest successful cutover.
- health, readiness, and release endpoints provide the first-line app-side proof for current release state.

### Boundary audit evidence

- `web/scripts/check-env-boundaries.mjs` remains the repo-owned audit rail for environment separation.
- PR validation and staging deploy continue to execute that audit before later steps.

## Residual Limits

- no centralized log sink, metrics backend, or trace backend exists in the repo.
- structured request logs remain API-first even though request IDs now begin at the proxy edge.
- no background-job observability surface exists yet because that runtime surface has not been rebuilt.
- live staging remains constrained by the temporary `DATABASE_ENABLED=false` rail until the Phase 6 staging DB path is fully restored.
- the current audit proof path is intentionally narrow; it proves the write/query rails exist without claiming full product-wide audit coverage.
