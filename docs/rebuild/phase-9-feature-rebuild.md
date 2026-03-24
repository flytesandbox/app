# Phase 9 - Feature Rebuild

Status: implemented locally, staging pending environment and commit gates
Date: 2026-03-24

## Goal

Turn the current deployable shell into an installable base application that can
be pushed to staging for real UI/UX testing.

## Phase 9 Outcome

Phase 9 now exists as a real base application rather than a shell-only rebuild.
The repo has a coherent first vertical slice:

- an intentional public landing page
- a redesigned signed-in dashboard
- a tenant application workspace and review flow
- an internal application review queue
- private API surfaces that return preview or live application data
- install/build guidance that matches the repo's current structure

This is enough to treat the app as the next iteration beyond the Phase 4 shell.
It is not yet safe to call the entire phase fully closed until the DB-backed
install path and staging promotion path are executed on a live environment.

## Delivered Changes

### Product surface

- Replaced the old shell-first homepage and app metadata with a base-app public
  entry surface.
- Reworked the dashboard into a task-oriented signed-in starting point.
- Added the singular `/dashboard/application` workspace route and the
  `/dashboard/application/review` handoff route as the first tenant workflow.
- Redirected the legacy plural application routes to the new singular paths.
- Reworked the internal applications queue so reviewers can inspect recent
  application records and push statuses forward.

### Data and API surface

- Added `web/lib/applications.ts` as the shared data layer for application
  drafts, submission, review status changes, titles, and labels.
- Added server actions for tenant draft save/submit and internal status change.
- Updated the private application and admin application APIs to return live
  record summaries when DB mode is enabled and explicit preview payloads when it
  is not.
- Updated the admin status-change API to perform a real mutation instead of a
  simulated audit-only response.

### Install and build baseline

- Excluded generated build output from lint.
- Moved the custom Next build directory away from `.next-phase7`.
- Switched the production build command to `next build --webpack`.
- Updated the standalone Docker copy paths for the new build directory.
- Added concrete bootstrap instructions to the repo root and `web/` READMEs.

## Validation Results

Validated on 2026-03-24:

- `npm run lint` from `web/`: passed
- `npm run typecheck` from `web/`: passed
- `npm run build` from `web/`: passed when rerun outside the sandbox
- `docker compose -f local-db/compose.yml config`: passed
- `docker compose -f local-db/compose.yml ps`: failed because the Docker daemon
  is not running on this host
- `npm run db:check` from `web/`: failed with `ECONNREFUSED 127.0.0.1:3307`
  because local MySQL is not running

Sandbox note:

- The first in-sandbox `npm run build` failed with `spawn EPERM` after
  compilation. The same command passed when rerun outside the sandbox, which
  indicates a sandbox execution constraint rather than a remaining app build
  defect.

## Remaining Promotion Blockers

- Docker Desktop must be running locally so the MySQL container can start.
- The DB-backed bootstrap sequence still needs to be executed cleanly:
  `docker compose up -d`, `npm run db:migrate`, `npm run db:seed`,
  `npm run db:check`.
- The repo is still on a dirty `main` worktree that includes broader Phase 8
  and Phase 9 changes, so there is no safe automated commit/push boundary yet.
- Staging promotion should only happen after the intended commit set is clean
  and the DB-backed local path is proven.

## Staging Decision

If staging is only being used for UI layout review, the current Phase 9 surface
can still be deployed in preview-style mode. If the intent is to test saved
drafts, submission, and reviewer status changes, staging should wait until the
database path is confirmed live.

## Immediate Next Steps

1. Start Docker Desktop locally.
2. Run the DB bootstrap sequence end-to-end.
3. Confirm the application workflow persists and submits against the local DB.
4. Create the intended commit boundary from the current dirty worktree.
5. Push through the normal PR and GitHub Actions staging flow.
6. Run UI/UX review on `https://staging.mecplans101.com`.
