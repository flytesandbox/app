## Web app

This directory contains the current deployable Next.js application.

## Local setup

1. Make sure the local MySQL container is running from `../local-db`.
2. Copy `.env.example` to `.env.local`.
3. Replace the Clerk placeholders with real local development values.
4. Run `npm ci`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Run `npm run dev`.

## Scripts

- `npm run dev` starts the local app.
- `npm run lint` checks source-owned files.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run build` creates the production build using the repo's standalone settings.
- `npm run db:migrate` applies ordered SQL migrations.
- `npm run db:seed` seeds the local database with deterministic fake data.
- `npm run db:check` validates DB connectivity and migration state.

## Current app surface

- public landing page
- Clerk-backed sign-in and sign-up
- protected dashboard
- tenant application workspace and review flow
- internal review queue
- health, readiness, release, and private API surfaces
