# Environment Boundary Guardrails

Status: Active
Date: 2026-03-24

## Purpose

Turn the rebuild's environment-separation rules into executable rails so local-only content cannot drift into staging and staging-specific values do not silently become production defaults.

## Audit Findings

- The phase docs already lock separate local, staging, and prod identities, but the runtime code previously validated value shape without validating environment identity.
- CI intentionally used loopback URLs and test-only auth placeholders, but the runtime and deploy rails did not independently prevent those local/CI patterns from appearing in staging.
- The `PHASE5_TEST_AUTH` bypass was controlled only by an env var, so accidental enablement outside local/CI remained possible.
- The staging deploy rail validated required values and formats, but it did not require `APP_ENV=staging`, did not tie `NEXT_PUBLIC_APP_URL` to the staging hostname, and did not reject local DB hosts if staging DB mode were enabled.
- The repo still does not have an executable production deploy path. Production separation is documented, but not yet implemented as code.

## Guardrails Added

### Runtime startup

- `web/lib/env/server.ts` now validates `APP_ENV` as one of `local`, `ci`, `staging`, or `prod`.
- `NEXT_PUBLIC_APP_URL` and `CLERK_AUTHORIZED_PARTIES` must now match the correct environment hostname:
  - local/CI: loopback only
  - staging: `https://staging.mecplans101.com`
  - prod: `https://mecplans101.com`
- local/CI may use Clerk test keys only.
- prod must use Clerk live keys.
- `PHASE5_TEST_AUTH` is rejected outside local/CI.

### Database contract

- `web/lib/db/config.ts` now binds DB host and DB name to `APP_ENV`.
- local and CI must stay on local-only DB hosts.
- staging and prod must not use local-only DB hosts.
- expected database names are locked:
  - local: `app_local`
  - ci: `app_ci`
  - staging: `app_staging`
  - prod: `app_prod`
- staging/prod require `DB_SSL_REQUIRED=true` when DB mode is enabled.

### CI and staging deploy

- PR validation now runs `web/scripts/check-env-boundaries.mjs` to audit tracked config/workflow surfaces.
- the staging deploy workflow also runs the same audit before build/push.
- the staging workflow now requires:
  - `APP_ENV=staging`
  - `STAGING_DEPLOY_PATH=/app/staging`
  - `STAGING_WEB_HOST=staging.mecplans101.com`
  - staging HTTPS origin values only
  - non-local staging DB hosts and `app_staging` DB names when DB mode is enabled
  - `DB_SSL_REQUIRED=true` when DB mode is enabled
- the remote staging deploy/rollback scripts now enforce the same staging-only runtime boundary before replacing the service.
- the remote SSH block unsets inherited `PROBE_*` variables so dev/local shell residue cannot leak into staging probes.

### Examples and placeholders

- `web/.env.example` now uses explicit local/test-safe Clerk placeholders instead of ambiguous generic placeholders.
- `infra/compose/staging/runtime.env.example` now carries sanitized staging-shaped placeholders instead of an empty file.

## Remaining Gaps

- There is still no production compose file or production deploy workflow in the repo, so staging-to-production promotion is not yet guarded by executable repo code.
- GitHub environment secret uniqueness across staging vs prod cannot be proven from the repo alone. Human/operator discipline and future secret-management policy still matter.
- Server-side Traefik state is operational infrastructure, not fully represented in this repo. The repo can validate labels and contracts, but not whether the live proxy is loading them correctly.
- Separate staging data sanitization policy is documented, but no automated data-content scanner exists yet for future staging dataset imports.

## Required Next Work Before Production

- add a real production compose/deploy path under the same boundary policy
- add production GitHub environment validation parallel to the staging rail
- add production-only secret ownership and server-path checks
- add an explicit data-import/sanitization control for any future staging refresh process
