# Phase 8 - Observability and Auditability

Status: complete
Date: 2026-03-24

## Goal

Turn the current deployable app shell/API surface, staging deploy rail, and rebuild operator work into an observable, auditable, operator-friendly system with enough evidence to understand deploy state, current app state, and sensitive system actions without relying on memory or ad hoc debugging.

## Current Starting Point

- Phase 7 completed under the temporary `DATABASE_ENABLED=false` staging pass condition.
- `docs/rebuild-log/current.md` was already active as an operator-facing rebuild journey log.
- `docs/rebuild-log/tools/append-entry.ps1` already provided append-only logging for rebuild, deploy, and recovery work.
- `web/app/api/health/route.ts` and `web/app/api/ready/route.ts` already provided the minimum app shell/API smoke surface.
- staging deploy and rollback rails already wrote release metadata for image tag and deploy state.
- recent Phase 7 follow-up work added stronger deploy diagnostics and environment-boundary validation.
- the baseline schema already included `audit_events`, but the historical trail reviewed at kickoff did not yet prove a complete end-to-end audit flow in the live system.

## Canonical Decisions

- Phase 8 remained observability and auditability. It was not feature rebuild, production cutover, or a replacement for the existing phase structure.
- The rebuild logging system counted as existing observability groundwork and needed to be hardened rather than replaced.
- During Phase 8, keep a support-style transcript in `docs/historical/` as a living copy of actual support-chat content for later analysis.
- That temporary support-chat transcript remains intentionally outside the rebuild-log system and must not be wired into the app shell/API surface, package scripts, CI deploy behavior, or compose files.
- Observability artifacts must stay redaction-safe. Do not write secrets, private keys, full DB URLs, host fingerprints, or private IPs into docs or app/deploy logs.
- References to the deployable app living under `web/` describe this build's current repo state only. They do not create a canonical rule that dev apps should live inside the build system.
- Operator evidence should prefer repo-owned, append-friendly artifacts over memory or one-off notes.

## What Phase 8 Delivered

### Operator trail

- `docs/rebuild-log/current.md` remains the active operator rebuild/deploy/recovery stream.
- `docs/rebuild-log/tools/append-entry.ps1` remains the canonical append path.
- `docs/rebuild-log/tools/archive-current.ps1` now provides a repo-owned archive/reset command for closed streams.
- `docs/rebuild-log/README.md` now documents the archive lifecycle instead of leaving it as prose only.
- `docs/historical/app_phase8_support_chat.md` remains the temporary Phase 8 support transcript outside the rebuild-log system.

### App shell/API observability

- current API routes run through `web/lib/observability/http.ts` for stable route IDs, structured request logs, `X-Request-Id`, and JSON `requestId` correlation.
- `web/lib/observability/request-id.ts` now defines the shared request-ID contract.
- `web/proxy.ts` now accepts or generates a request ID at the request edge, forwards it downstream, and returns it on the broader app response surface.
- `web/lib/observability/release.ts` now provides sanitized release metadata for logs and responses.
- `GET /api/release` now exposes a minimal release-visibility surface.
- `/api/health` and `/api/ready` now include sanitized release metadata in their responses.

### Deploy and release evidence

- the staging deploy workflow now writes `RELEASE_*` values into both runtime `.env` and `release.env`.
- remote deploy and rollback scripts now sync `RELEASE_*` values into the runtime env file as part of successful cutover.
- `web/.env.example` now documents the release metadata keys expected at runtime.
- release visibility is now readable from app responses and from the server-side release files instead of only from deploy script memory.

### Audit evidence

- `web/lib/audit/events.ts` provides the repo-owned audit write/query helper over `audit_events`.
- `POST /api/private/admin/status-change` proves a Phase 8 audit write path when DB mode is enabled and reports `audit: skipped` when DB mode is disabled.
- `GET /api/private/admin/audit-events` provides a minimal internal query surface for recent audit history when DB mode is enabled.
- audit writes include actor, resource, event type, and request-correlation metadata rather than raw payload dumping.

## Completion Update - 2026-03-24

- request correlation now starts at the request edge instead of only inside API handlers.
- the current app shell/API surface now exposes release metadata through repo-owned runtime helpers and routes.
- deploy-time release evidence now stays aligned between workflow output, remote `release.env`, and the runtime `.env` consumed by the app.
- rebuild-log lifecycle handling now has a concrete archive tool and updated operator docs.
- Phase 8 now leaves the repo with a clearer evidence model across operator logs, app logs, deploy metadata, and audit records.

## Residual Limits After Completion

- no centralized log sink, metrics backend, or trace backend exists in the repo yet.
- structured request logs remain API-first; page renders and server-component execution do not yet emit their own dedicated structured log events even though request IDs now start at the proxy edge.
- live staging may still operate under the temporary `DATABASE_ENABLED=false` rail, so DB-backed audit proof remains stronger locally than in current staging until the DB rail is fully restored.
- Phase 8 intentionally proved the minimum audit contract; it did not claim full product-wide audit coverage for features that have not been rebuilt yet.

## Exit Decision

- operator rebuild logging and temporary historical support-chat capture are both active and documented.
- the repo now clearly defines logs, deploy visibility, audit evidence, and request/release correlation for the current app surface.
- shell/API responses, deploy metadata, and operator docs can now be tied together without guesswork.
- the audit-event contract is documented and proven as far as current DB availability allows.
- remaining limits are explicit and repo-owned rather than implied.
- Phase 8 is complete.

## Not In Scope

- feature rebuild
- production cutover
- replacing the phase system
- coupling `docs/rebuild-log/` into the app shell/API surface or CI behavior

## Next Phase

Phase 9 - Feature Rebuild
