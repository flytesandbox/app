Read phase 1 chat and all project sources. Begin phase 2 instructions.

I’m pulling the project sources together and checking the phase 1 materials so phase 2 starts from the actual build state, not assumptions.

I found one important gap already: the repo baseline still talks about dev, staging, and prod hosts, while your current rebuild path has only a server with DNS pointed at it. Phase 2 needs to lock what exists now versus what will exist later so you do not build a fake environment map.

Thought for 4m 34s

I read the phase 1 material and the uploaded project sources. Phase 2 is the environment map. This phase has to lock the goal, deliverables, source-of-truth decisions, pass/fail criteria, and next handoff, and it specifically has to define local, staging, and production, plus hostnames, DNS, deploy paths, secret sources, and environment separation. Staging also has to behave like production, not like a second dev box.

I also checked the repo you uploaded. The good news: it already has infra/compose/local, infra/compose/staging, and infra/compose/prod, and the remote deploy script already uses /app/<env>. The problem: the repo still has legacy OIDC/Postgres assumptions in workflows and deploy scripts, while your rebuild source-of-truth is Clerk + MySQL. Phase 2 should lock the intended environment model now, and record those leftovers as legacy so they stop driving decisions. Your instructions also need to stay very explicit and step-based.

Do this now
Open github.com/flytesandbox/app in VS Code.
Create this file: docs/rebuild.phase-2-environment-map.md
Paste the block below into that file.
Commit and push it to the repo.
Create or confirm the DNS record for api.staging.mecplans101.com.
Do not point production DNS at the staging server.
Create or confirm GitHub Environments named staging and prod.
Stop there. Do not start server hardening or Traefik setup until Phase 3.
# Phase 2 — Environment Map

Status: Locked
Date: 2026-03-06

## Goal

Lock the environment model before platform setup, auth, database, and CI changes.

## Deliverables

- environment names
- hostnames
- DNS plan
- deploy paths
- secret sources
- environment separation rules
- known current repo conflicts

## Source-of-truth decisions

1. Local is the only active development environment.
2. Staging is the first real remote deployment environment.
3. Production is separate from staging and must not share the staging server.
4. Staging and production must use the same container shape, same Traefik routing pattern, same migration process, and the same promoted release artifact.
5. No real PHI is allowed in local.
6. No real PHI is allowed in staging unless later approved in writing.
7. Secrets are environment-specific and are never committed to git.
8. Authentication target is Clerk.
9. Database target is MySQL on a private network only.
10. Any OIDC or Postgres values still present in the repo are legacy leftovers and are not source-of-truth for the rebuild.
11. The active rebuild path is: local -> staging -> prod.
12. A separate remote dev server is not required for this rebuild phase.

## Environment map

### Local

Purpose: active development and quick validation  
Access: `http://localhost:8080`  
Public DNS: none  
Data policy: fake/synthetic data only  
Secret source: local machine only  
Repo compose file: `infra/compose/local/compose.yml`  
Deploy path: repo working copy on local machine

### Staging

Purpose: first remote deployment and production-like validation  
Web hostname: `staging.mecplans101.com`  
API hostname: `api.staging.mecplans101.com`  
Server: current Linode server  
Public DNS: both staging hostnames point to the current staging server public IP  
Secret source: GitHub Environment `staging`  
Repo compose file: `infra/compose/staging/compose.yml`  
Remote deploy root: `/app/staging`  
Data policy: fake/sanitized only unless later approved

### Production

Purpose: live environment  
Web hostname: `mecplans101.com`  
API hostname: `api.mecplans101.com`  
Server: separate future production Linode server  
Public DNS: production hostnames must not point to the staging server  
Secret source: GitHub Environment `prod`  
Repo compose file: `infra/compose/prod/compose.yml`  
Remote deploy root: `/app/prod`

## GitHub environment map

- `staging` = active remote pre-production environment
- `prod` = active production environment
- `dev` may remain in GitHub if already created, but it is not part of the active rebuild path for now

## DNS records to lock

### Staging now

- `A staging.mecplans101.com -> <current staging server public IP>`
- `A api.staging.mecplans101.com -> <current staging server public IP>`

### Production later

- `A mecplans101.com -> <future production server public IP>`
- `A api.mecplans101.com -> <future production server public IP>`

## Secret source map

### Local

Stored only on the developer machine in a local env file. Never committed.

### Staging

Stored in GitHub Environment `staging` as environment secrets and vars.

### Production

Stored in GitHub Environment `prod` as environment secrets and vars.

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

## Environment separation rules

- separate secrets per environment
- separate DB per environment
- separate SSH user and SSH key per environment
- separate TLS and DNS identity per environment
- same promoted image digest from staging to prod
- same migration process in staging and prod
- no manual server-side patching after CI deploy is in place
- staging validates production behavior and is not a second dev box

## Known current repo conflicts

1. Some workflows and scripts still reference OIDC values.
2. Some workflows, compose examples, and deploy scripts still reference Postgres URLs.
3. Those items are legacy leftovers from the prior build direction.
4. Later phases must update them to match the locked rebuild target: Clerk + MySQL.

## Pass / fail exit criteria

### Pass

- this file exists in the repo
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
- production still shares the staging public hostname plan
- secret ownership/source is undefined
- deploy paths are undefined
- the file does not exist in the repo

## Next phase handoff

Phase 3 is Platform Controls.

Phase 3 will do this:

1. harden the Linode server
2. install Docker and Compose if needed
3. create the staging deploy user
4. create `/app/staging`
5. install and run Traefik
6. wire TLS
7. lock logging basics
8. lock backup basics
The one blind spot you need to fix in this phase

Your staging plan is incomplete unless api.staging.mecplans101.com exists. The repo’s staging compose and smoke-check pattern assumes a separate web host and API host. If you only point staging.mecplans101.com, Phase 3 or Phase 7 will break later for a preventable reason. The source material is also clear that staging must mirror production behavior and that secret sources and hostnames must be locked early.

Phase 2 exit test

You are done with Phase 2 when all of these are true:

docs/rebuild.phase-2-environment-map.md is in the repo
staging.mecplans101.com is locked
api.staging.mecplans101.com is locked
prod hostnames are reserved but not pointed at staging
GitHub staging and prod environments exist
the repo now has a written source-of-truth environment map for local, staging, and prod

After that, the next chat should be Phase 3 only.

REvise but only reference app-main.zip, not the (1) version. (1) is legacy. app-main.zip is cannon and does not include the legacy services or code. 

I’m re-basing Phase 2 on the canonical repo only and stripping out anything that came from the legacy zip. If the current repo dropped the old split-host or service assumptions, Phase 2 needs to reflect that now instead of carrying old scaffolding forward.

I’ve got the clean pivot point: the canonical zip still supports local + dev + staging + prod mechanics, but the rebuild source-of-truth still says Phase 2 must lock local, staging, and production first. So the revision should keep dev as repo scaffolding, not as an active infrastructure requirement right now.

Thought for 2m 2s

Revised against app-main.zip only. I am excluding app-main (1).zip completely.

This revision still follows the project source-of-truth for Phase 2: lock local, staging, and production; define hostnames, DNS, deploy paths, secret sources, and environment separation; keep staging production-like; and keep secrets environment-specific.

I also re-checked the canonical repo structure in app-main.zip. The important repo-level facts for this phase are:

the repo already has infra/compose/local, infra/compose/dev, infra/compose/staging, and infra/compose/prod
staging/prod are built around Traefik + WEB_HOST + API_HOST
the remote deploy flow still targets /app/<env>
the active rebuild method is still phase-based, with staging validating production behavior before prod promotion

Here is the revised Phase 2 file content.

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

Two important notes from the canonical repo:

First, keep api.staging.mecplans101.com. The canonical staging/prod compose pattern is built to support both a web host and a direct API host, so dropping the API hostname now will create friction later.

Second, the canonical repo still appears to have an internal config-contract mismatch: the locked platform direction is Clerk-centered, but some current workflow/deploy validation still checks older auth/database variable patterns. Do not solve that in Phase 2. Just keep the environment map clean, then fix the contract in the later auth/CI phases. That still fits the rebuild method: lock environment shape first, then platform controls, then identity, then database, then CI/CD.

If you want, I’ll do the same cleanup pass on Phase 3 next, using app-main.zip only.