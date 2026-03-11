# Phase 7 - CI/CD Pipeline

## Step 1 - Secret and config contract cleanup

Decisions locked:
- Phase 7 remains CI/CD for this rebuild.
- Secrets/config work is included here because pipeline trust depends on it.
- No secrets may be committed to the repo.
- Local uses `.env.local` only.
- Staging and production use GitHub environment secrets/variables only.
- `.env.example` is the source-of-truth placeholder contract for required app variables.
- `web/.env.local` in the Phase 6 snapshot was treated as exposed and rotated before pipeline work continued.

Required app env contract:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `CLERK_AUTHORIZED_PARTIES`
- `DATABASE_ENABLED`
- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `DB_SSL_REQUIRED`
- `DB_POOL_LIMIT`

Staging GitHub environment variables planned:
- `APP_ENV=staging`
- `NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
- `CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com`
- `DATABASE_ENABLED=true`
- `DB_SSL_REQUIRED=true`
- `DB_POOL_LIMIT=10`
- `STAGING_DEPLOY_PATH=/app/staging`
- `STAGING_WEB_HOST=staging.mecplans101.com`
- `STAGING_API_HOST=api.staging.mecplans101.com`
- `REGISTRY=ghcr.io`
- `IMAGE_NAME=flytesandbox/app-web`

Staging GitHub environment secrets planned:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `STAGING_DATABASE_URL`
- `STAGING_DATABASE_MIGRATION_URL`
- `STAGING_DATABASE_BACKUP_URL`
- `STAGING_SSH_PRIVATE_KEY`
- `STAGING_SSH_KNOWN_HOSTS`
- `STAGING_SSH_USER`
- `STAGING_SSH_HOST`
- `STAGING_SSH_PORT`

Step 1 checks completed:
- env files verified ignored by git
- local exposed values rotated
- `.env.example` converted to placeholder-only full contract
- no secrets staged for commit

- verified Phase 7 notes file through git diff intent-to-add flow
- verified env ignore rules with git check-ignore
- identified untracked repo state with no initial local commit
- deferred commit until repo tracking strategy is intentionally handled

## Step 2 - Runtime env contract locked

Decision:
- The Phase 7 web runtime contract stays narrow.
- Existing staging deploy transport secret names remain unchanged unless a real mismatch is found.
- Existing Phase 6 DB secret names remain unchanged unless a real mismatch is found.
- New Phase 7 config is added only where the deploy/runtime path newly requires it.

Tracked runtime contract in `web/.env.example`:
- `APP_ENV`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `CLERK_AUTHORIZED_PARTIES`
- `DATABASE_ENABLED`
- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `DB_SSL_REQUIRED`
- `DB_POOL_LIMIT`
- `IMAGE_NAME`

Staging environment variables target:
- `APP_ENV=staging`
- `NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
- `CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com`
- `DATABASE_ENABLED=true`
- `DB_SSL_REQUIRED=true`
- `DB_POOL_LIMIT=10`
- `IMAGE_NAME=ghcr.io/flytesandbox/app-web`

Staging environment secrets:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`

Existing secret contracts to preserve unless mismatch is found:
- existing Phase 6 DB secrets
- existing staging SSH transport secrets:
  - `STAGING_SSH_HOST`
  - `STAGING_SSH_PORT`
  - `STAGING_SSH_USER`
  - `STAGING_SSH_PRIVATE_KEY`
  - `STAGING_SSH_KNOWN_HOSTS`

Checks completed for Step 2:
- runtime env contract narrowed and documented
- no established DB or SSH secret names renamed in repo docs
- `web/.env.example` kept placeholder-only
- staging runtime values separated into vars vs secrets
- locked `IMAGE_NAME=ghcr.io/flytesandbox/app-web` for pipeline use

## Step 3 - Fail-fast server env validation

Created:
- `web/lib/env/server.ts`

Startup hook:
- imported `@/lib/env/server` from `web/app/layout.tsx`

Behavior locked:
- validates server runtime env before app serves real traffic
- fails fast on missing or malformed required env
- separates always-required values from DB-required values
- reuses existing Phase 6 DB config validation for:
  - `DATABASE_ENABLED`
  - `DATABASE_URL`
  - `DATABASE_MIGRATION_URL`
  - `DB_SSL_REQUIRED`
  - `DB_POOL_LIMIT`

Always-required values validated:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `CLERK_AUTHORIZED_PARTIES`

Database-conditional behavior:
- when `DATABASE_ENABLED=true`, DB URLs must validate through existing DB config rails
- when `DATABASE_ENABLED=false`, DB URLs are not required

Checks completed:
- validator loads from a server-only path
- app fails early on broken Clerk/app-origin config
- app fails early on broken DB config when DB is enabled
- no secrets exposed to client code

Final result for Step 4:
- `/api/health` returned `200 alive`
- `/api/ready` returned `200 ready`
- env validation passed
- local runtime DB connectivity passed
- Phase 7 minimum smoke-check surface is now live

Corrections applied during Step 4:
- excluded health/readiness from Clerk proxy dependency path
- fixed missing `getServerEnv` export in `web/lib/env/server.ts`
- replaced placeholder Clerk runtime values in `web/.env.local` with real local dev values
- aligned local DB credentials in `web/.env.local` with `local-db/init/001-users.sql`
- confirmed local MySQL container healthy on `127.0.0.1:3307`

## Step 5 - Containerize the current app

Final result:
- `web/Dockerfile` created
- `web/.dockerignore` created
- current web app containerized without artificial service split
- image built successfully as `ghcr.io/flytesandbox/app-web:local-step5`
- detached container ran successfully on port 3000
- `/api/health` returned 200 from inside container runtime
- `/api/ready` returned 200 from inside container runtime

Corrections applied during Step 5:
- moved fail-fast env validation off the build path and into startup instrumentation
- removed duplicate JWT validator definition from `web/lib/env/server.ts`
- corrected container env handling for PEM/JWT formatting
- corrected container DB host for local Docker-to-host MySQL access
- verified detached-container smoke test pattern instead of relying on foreground-only startup output

Final result for Step 6:
- `infra/compose/staging/compose.yml` created
- `infra/compose/staging/.env.example` created
- local compose validation succeeded with externalized runtime env path
- staging compose defines web service only
- image source is GHCR
- service joins external edge network
- Traefik routes `staging.mecplans101.com`
- app internal port remains `3000`
- restart policy is set
- database remains outside this compose file

Correction applied:
- runtime env file path was parameterized for local validation
- local validation used repo placeholder runtime env
- real staging deploy will point `APP_RUNTIME_ENV_FILE` to `/app/staging/.env`

Step 7 progress:
- remote deploy and rollback scripts uploaded to `/app/staging`
- script ownership corrected to `stage_deploy`
- both scripts pass `bash -n` on the staging server
- remaining completion items:
  - place `compose.yml`, `compose.env`, and `.env` in `/app/staging`
  - verify rebuilt image can execute `node ./scripts/db-migrate.mjs`

  Step 7 local validation complete:
- rebuilt image passed local migration execution
- `node ./scripts/db-migrate.mjs` ran successfully inside `ghcr.io/flytesandbox/app-web:local-step7`
- migration rail correctly skipped already-applied migrations and exited cleanly

Step 7 remaining server completion items:
- replace placeholder `/app/staging/compose.yml` with real staging compose config
- replace placeholder `/app/staging/compose.env` with real compose interpolation values
- replace placeholder `/app/staging/.env` with real staging runtime env values
- then remote deploy rail can be tested with a real image tag

Step 8 progress:
- release metadata tracking added through `/app/staging/release.env`
- deploy script now creates/writes release metadata after successful deploy
- rollback script now creates/writes release metadata after successful rollback
- tracked fields:
  - `RELEASE_GIT_SHA`
  - `RELEASE_IMAGE_TAG`
  - `RELEASE_DEPLOYED_AT`
  - `RELEASE_PREVIOUS_GOOD_TAG`

Step 8 - Release metadata tracking

Completed:
- `/app/staging/release.env` created on the staging server
- tracked fields:
  - `RELEASE_GIT_SHA`
  - `RELEASE_IMAGE_TAG`
  - `RELEASE_DEPLOYED_AT`
  - `RELEASE_PREVIOUS_GOOD_TAG`
- updated deploy and rollback scripts remain bash-valid after metadata support changes
- release state is no longer dependent on memory or guesswork

## Step 9 - PR validation workflow

Created:
- `.github/workflows/pr.yml`

PR trigger:
- pull requests to `main`

Jobs added:
- `lint`
- `build`
- `db-migrate`
- `db-check`
- `playwright-smoke` (non-required initially)

Decisions locked:
- required PR checks stay narrow during early rebuild
- stable required set:
  - `lint`
  - `build`
  - `db-migrate`
  - `db-check`
- Playwright remains advisory until deterministic and consistently green
- each DB job starts its own fresh MySQL service container
- `db-check` reruns migrations because service-container state does not persist across jobs

PR smoke validation branch created to verify Phase 7 pull request checks.

## Step 9 - PR validation findings and narrow-scope fix

Observed during PR validation:
- GitHub Actions PR run surfaced MySQL service-container warnings:
  - `root@localhost is created with an empty password`
  - `CA certificate ca.pem is self signed`
  - `Insecure configuration for --pid-file: Location '/var/run/mysqld' in the path is accessible to all OS users`
- GitHub Actions `db:migrate` failed with:
  - `Error: Table 'schema_migrations' already exists`

Decision:
- For Step 9, only blocking failures that prevent PR validation from completing are in scope.
- The MySQL warnings above are recorded for later review but are not treated as the current Step 9 blocker because they come from the ephemeral CI MySQL service container, not the staging or production database posture.
- The actual Step 9 blocker is the migration bootstrap conflict where the migration runner creates `schema_migrations` and `0001_phase6_baseline.sql` also attempts to create `schema_migrations`.

Root cause locked:
- `web/scripts/db-migrate.mjs` owns creation of the migration ledger table.
- `web/db/migrations/0001_phase6_baseline.sql` must not create `schema_migrations`.

Step 9 corrective action:
- Remove `schema_migrations` creation from `web/db/migrations/0001_phase6_baseline.sql`.
- Keep the migration runner as the single owner of migration ledger bootstrapping.
- Re-run PR validation after the fix.

Deferred follow-up queue after Phase 7 critical path:
- Review whether the CI MySQL service container should be hardened further or left as-is for disposable PR validation.
- Reassess Playwright warnings/failures only if they block Phase 7 exit criteria.
- Keep Step 9 scope narrow: PR validation first, then merge-to-main staging deploy flow.

Step 9 expected pass condition after fix:
- `lint` passes
- `build` passes
- `db:migrate` passes
- `db:check` passes
- Playwright remains advisory unless explicitly promoted to required later

Step 9 Complete

One guardrail passed:

Merged Step 10 because Step 9 fix PR is green and merged.

image pull

migration run

service restart

/api/health

/api/ready


## Step 10 - Staging deploy workflow

Created:
- `.github/workflows/deploy-staging.yml`

Triggers:
- push to `main`
- manual dispatch

Environment:
- `staging`

Permissions:
- `contents: read`
- `packages: write`

Deploy rail locked:
- checkout repo
- authenticate to GHCR
- build the web image from `web/Dockerfile`
- tag image with commit SHA
- push image to GHCR
- generate staging runtime `.env` from GitHub environment vars/secrets
- generate staging `compose.env` with the target image tag
- generate release metadata file for transfer
- copy `compose.yml`, `.env`, `compose.env`, and `release.env` to the staging server
- execute `/app/staging/deploy_remote.sh` over SSH

Decision:
- the workflow does not replace the remote deploy script
- `deploy_remote.sh` remains the single authority for:
  - explicit DB migration execution
  - compose pull/up
  - `/api/health` probe
  - `/api/ready` probe
  - release metadata finalization

Expected pass behavior:
- workflow fails if image build/push fails
- workflow fails if remote migration fails
- workflow fails if remote health/readiness checks fail
- successful deploy results in a new staging image tag equal to the commit SHA

Environment contract used by Step 10:
Variables:
- `APP_ENV`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `CLERK_AUTHORIZED_PARTIES`
- `DATABASE_ENABLED`
- `DB_SSL_REQUIRED`
- `DB_POOL_LIMIT`
- `REGISTRY`
- `IMAGE_NAME`
- `STAGING_DEPLOY_PATH`
- `STAGING_WEB_HOST`

Secrets:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `STAGING_DATABASE_URL`
- `STAGING_DATABASE_MIGRATION_URL`
- `STAGING_SSH_PRIVATE_KEY`
- `STAGING_SSH_KNOWN_HOSTS`
- `STAGING_SSH_USER`
- `STAGING_SSH_HOST`
- `STAGING_SSH_PORT`