# app

This repo now treats the application, the ecosystem Wiki, and the `Support`
logging/monitoring service as separate but bounded parts of one system.

Active source-of-truth docs:

- `docs/wiki/README.md`
- `docs/wiki/architecture/ecosystem-overview.md`
- `docs/support/README.md`
- `docs/support/install.md`

Support-generated records live under `docs/wiki/archive/support-generated/`.

## Local bootstrap

Prerequisites:

- Node.js 20+
- npm 10+
- Docker Desktop running locally
- local Clerk keys ready for `web/.env.local`

Bootstrap sequence:

1. Copy `local-db/.env.example` to `local-db/.env`.
2. Start MySQL with `docker compose -f local-db/compose.yml up -d`.
3. Copy `web/.env.example` to `web/.env.local` and replace the Clerk placeholders.
4. In `web/`, run `npm ci`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Run `npm run dev`.

The local DB runs on `127.0.0.1:3307` and is intentionally local-only.

`docs/support/evidence/` is the live operator-evidence path used by `Support`
without wiring doc tooling into runtime or deploy behavior.

## Useful checks

From `web/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:check`

## Staging path

Staging deploys through GitHub Actions, not manual server patching. The current
release path is:

1. validate locally
2. merge through the existing PR workflow
3. deploy to staging with `.github/workflows/deploy-staging.yml`
4. review the resulting UI at `https://staging.mecplans101.com`
