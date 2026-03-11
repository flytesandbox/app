# Phase 2 — Environment Map

Status: Locked
Date: 2026-03-06

## Goal

Lock the environment model for the canonical rebuild repo before platform controls, auth wiring, database setup, and CI deployment changes.

## Deliverables

- environment names
- active environment roles
- hostnames
- DNS plan
- deploy paths
- secret sources
- environment separation rules
- current repo-to-rebuild decisions

## Source-of-truth decisions

1. Local is the primary active development environment.
2. Staging is the first real remote deployment environment.
3. Production is separate from staging and must not share the staging server.
4. Staging must validate production behavior, not behave like a second dev box.
5. Staging and production must use the same container shape, same Traefik routing pattern, same migration process, and same promoted release artifact.
6. Local uses fake/test-safe data only.
7. Staging uses fake/sanitized data only unless later explicitly approved otherwise.
8. Secrets are environment-specific and are never committed to git.
9. Clerk is the auth boundary target.
10. MySQL is the target database direction for the rebuild.
11. The canonical repo includes a `dev` environment path, but `dev` is not required to stand up the rebuild right now.
12. The active rebuild path for now is: local -> staging -> prod.

## Environment map

### Local

Purpose: active development and rapid validation  
Access: `http://localhost:8080`  
Public DNS: none  
Data policy: fake/test-safe only  
Secret source: local machine only  
Repo compose file: `infra/compose/local/compose.yml`  
Deploy path: local repo working copy

### Dev (repo-reserved, not active infrastructure requirement right now)

Purpose: reserved remote environment path already present in the canonical repo  
Status: not required to complete this rebuild phase  
Public DNS: not required right now  
Secret source: GitHub Environment `dev` only if activated later  
Repo compose file: `infra/compose/dev/compose.yml`  
Remote deploy root if activated later: `/app/dev`

### Staging

Purpose: first remote deployment and production-like validation  
Web hostname: `staging.mecplans101.com`  
API hostname: `api.staging.mecplans101.com`  
Server: current Linode server  
Public DNS:
- `A staging.mecplans101.com -> <current staging server public IP>`
- `A api.staging.mecplans101.com -> <current staging server public IP>`
Secret source: GitHub Environment `staging`  
Repo compose file: `infra/compose/staging/compose.yml`  
Remote deploy root: `/app/staging`  
Data policy: fake/sanitized only unless later explicitly approved

### Production

Purpose: live environment  
Web hostname: `mecplans101.com`  
API hostname: `api.mecplans101.com`  
Server: separate future production Linode server  
Public DNS:
- `A mecplans101.com -> <future production server public IP>`
- `A api.mecplans101.com -> <future production server public IP>`
Secret source: GitHub Environment `prod`  
Repo compose file: `infra/compose/prod/compose.yml`  
Remote deploy root: `/app/prod`

## GitHub environment map

- `staging` = active remote pre-production environment
- `prod` = active production environment
- `dev` = reserved because the canonical repo already includes it, but it is not required to stand up now

## Secret source map

### Local
Stored only on the developer machine in a local env file. Never committed.

### Staging
Stored in GitHub Environment `staging` as environment secrets and vars.

### Production
Stored in GitHub Environment `prod` as environment secrets and vars.

### Dev
Only used if/when the reserved repo path is activated later.

## Remote path layout

### Staging
- `/app/staging/compose.yml`
- `/app/staging/.env`
- `/app/staging/migrations/`
- `/app/staging/version.json`

### Production
- `/app/prod/compose.yml`
- `/app/prod/.env`
- `/app/prod/migrations/`
- `/app/prod/version.json`

### Dev
- `/app/dev/compose.yml`
- `/app/dev/.env`
- `/app/dev/migrations/`
- `/app/dev/version.json`

## Environment separation rules

- separate secrets per environment
- separate database per environment
- separate SSH user and SSH key per environment
- separate DNS/TLS identity per environment
- same promoted image digest from staging to prod
- same migration process in staging and prod
- no manual server-side patching after CI deploy is in place
- staging validates production behavior and is not a second dev box

## Canonical repo decisions for this phase

1. Keep `local`, `staging`, and `prod` as the active rebuild environments.
2. Preserve `dev` as a reserved repo path only.
3. Keep separate web and API hostnames for staging and prod because the canonical compose pattern supports both.
4. Keep `/app/<env>` as the remote deployment root pattern because the canonical deploy flow already uses it.
5. Do not collapse staging and production onto one DNS identity or one server plan.

## Pass / fail exit criteria

### Pass

- this file exists in the repo
- local, staging, and prod are locked as active rebuild environments
- `dev` is explicitly marked reserved, not required now
- staging web hostname is locked
- staging API hostname is locked
- production web hostname is locked
- production API hostname is locked
- staging and production deploy roots are locked
- GitHub Environment names are locked
- local/staging/prod secret sources are locked
- production DNS is not pointed at the staging server

### Fail

- no API hostname exists for staging
- production still shares the staging hostname/server plan
- secret ownership/source is undefined
- deploy paths are undefined
- `dev` is treated as required even though it is not being stood up now
- the file does not exist in the repo

## Next phase handoff

Phase 3 is Platform Controls.

Phase 3 will do this:

1. harden the Linode server
2. create the staging deploy user
3. create `/app/staging`
4. install Docker and Compose if needed
5. install and run Traefik
6. wire TLS
7. lock logging basics
8. lock backup basics
9. lock secret handling basics
