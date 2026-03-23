Read phase 1-6 chats, and all project sources. Each Phase chat also has a corresponding Suport chat. Sometimes 2 Support chats. Read them all so you know what's happening. 

- app-main.zip is the cannon of the repo before deleting it and starting the new one. Note: this only exists for reference. Remember that we are starting over from scratch and following the Phases. 
- app-main (1).zip is legacy and should not be read. 
- The current app files have been uploaded to this chat showing how far we've come int he process. 
- the repo in GitHub has the correct environments, secrets and variables added to support the next Phase of development.

Assume instructions from the previous Phases have been executed and we are green light to proceed with the next Phase. 

Begin phase 7 instructions.

I’m pulling the phase trail together first, then I’ll turn it into Phase 7 instructions that fit the rebuild sequence and the current repo state.

I found the current Phase 6 repo snapshot. I’m checking the actual workflow and deploy files now so Phase 7 matches what already exists instead of inventing a new path.

I found one real conflict in the source set: the generic dev-process file numbers secrets/config as Phase 7, but the project source-of-truth locks Phase 7 as CI/CD. I’m following the project source-of-truth and folding secrets/config into the Phase 7 pipeline contract instead of splitting it out.

Thought for 8m 17s

I reviewed the available Phase 1–6 phase/support trail plus the uploaded project sources and current Phase 6 repo snapshot.

One conflict exists in the source set: Dev-process.txt numbers secrets/config as Phase 7 and CI/CD as Phase 8, but the project source-of-truth explicitly locks Phase 7 = CI/CD pipeline. I’m following the project source-of-truth and folding secrets/config work into this phase so the numbering stays consistent.

Phase 7 — CI/CD Pipeline
Goal

Build the first real deployment pipeline so the app can move from GitHub to staging through CI only, with migrations and smoke checks included, and without manual server patching. That is the locked outcome for this rebuild path.

What carries forward from Phases 1–6

The rebuild path is still local -> staging -> prod, with staging on staging.mecplans101.com, API staging on api.staging.mecplans101.com, and remote staging deploy root at /app/staging. The broader rule is that staging must behave like production, not like a second dev box.

The project already locked Clerk auth, backend authorization, tenant isolation, MySQL, ordered SQL migrations, separate DB users, local-only seeds, and DB check/migrate scripts. Phase 7 should use those rails, not replace them.

Your response format also needs to stay step-by-step and low-noise. That is directly aligned with the developer constraints in the source set.

Critical findings from the current Phase 6 snapshot

Two things need to be handled before deployment work:

The current snapshot includes a populated web/.env.local with real-looking local credentials. Treat those values as exposed and rotate them before reusing them anywhere.
The current snapshot shows DB rails and app routes, but it does not show dedicated health/readiness endpoints or workflow files. So Phase 7 is not just “wire secrets.” It needs to create the deploy pipeline and basic smoke-check surfaces.
Exact deliverables for Phase 7

By the end of this phase, the repo should contain:

a PR validation workflow
a staging deploy workflow
a production promotion workflow stub or live manual workflow
a real Docker image build path for the current app
a staging compose file
a remote deploy script
a rollback script
health and readiness endpoints
a locked environment-variable and secret contract
a Phase 7 note file in docs/rebuild/

The project source-of-truth already says this phase must set up PR checks, build artifacts, registry flow, staging deploy, smoke tests, and promotion rules.

Source-of-truth decisions for this phase

These are the rules for Phase 7:

Promote the same artifact across environments. Do not rebuild differently for prod.
Treat DB migrations as a first-class release step, not a side effect.
Secrets stay in GitHub environment secrets; non-secret config can live in GitHub environment variables. GitHub documents both environment secrets and environment variables for jobs that target an environment.
Use GitHub Container Registry for the image path. GitHub documents using GITHUB_TOKEN inside workflows to publish packages associated with the workflow.
The remote deploy should use Compose on the server. Docker documents docker compose pull for pulling service images and docker compose up for creating or recreating services.
Do not expand into feature work in this phase. The locked build order is CI/CD first, observability next, feature rebuild after that.
Step-by-step implementation order
Step 1 — Clean the secret situation first

Do this before any workflow work.

Rotate the local Clerk keys and any local DB passwords found in the uploaded Phase 6 snapshot.
Make sure web/.env.local is ignored and not committed.
Keep only placeholder values in web/.env.example.
Create one source-of-truth secret contract in docs/rebuild/phase-7-ci-cd-pipeline.md.

Use this split:

GitHub Environment staging variables

APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com
DATABASE_ENABLED=true
DB_SSL_REQUIRED= set to the real staging requirement
DB_POOL_LIMIT=10
STAGING_DEPLOY_PATH=/app/staging
STAGING_WEB_HOST=staging.mecplans101.com
STAGING_API_HOST=api.staging.mecplans101.com
REGISTRY=ghcr.io
IMAGE_NAME=flytesandbox/app-web

GitHub Environment staging secrets

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_JWT_KEY
STAGING_DATABASE_URL
STAGING_DATABASE_MIGRATION_URL
STAGING_DATABASE_BACKUP_URL
STAGING_SSH_PRIVATE_KEY
STAGING_SSH_KNOWN_HOSTS
STAGING_SSH_USER
STAGING_SSH_HOST
STAGING_SSH_PORT

Keep the contract flat and explicit. No guessing later.

Step 2 — Add startup validation

Create one runtime validator for the web app so staging fails fast when config is wrong.

Create:

web/lib/env/server.ts

This file should validate:

Clerk keys
Clerk authorized parties
public app URL
DB enabled flag
DB URL
DB migration URL
DB SSL flag
DB pool limit

Then import that validator in the app startup path or server-only DB access path so bad config dies immediately. This directly matches the fail-fast rule already locked in the project process.

Step 3 — Add health endpoints

Create:

web/app/api/health/route.ts
web/app/api/ready/route.ts

Use this behavior:

/api/health

returns 200
no DB dependency
confirms app process is alive

/api/ready

returns 200 only if:
env validation passed
DB connection works when DATABASE_ENABLED=true

Without these, your staging smoke check is weak.

Step 4 — Containerize the current working app

Do not force a fake multi-service deployment yet. The working code in the current Phase 6 snapshot is centered on the Next.js web app, not a separately deployed API/worker stack.

Create:

web/Dockerfile
web/.dockerignore

Build target:

production Next.js server image
installs dependencies
runs next build
starts with npm run start

Keep this phase to the current real surface:

deploy web
connect it to staging MySQL
route it through staging Traefik

Do not invent api and worker containers just to satisfy an abstract architecture diagram.

Step 5 — Add the staging compose file

Create:

infra/compose/staging/compose.yml

This file should:

define the web service only for now
use the GHCR image tag
consume a staging .env
join the network expected by Traefik on the server
expose the correct internal app port
include Traefik labels for staging.mecplans101.com

Also create:

infra/compose/staging/.env.example

That file should contain placeholders only.

Step 6 — Add the remote deploy and rollback scripts

Create:

infra/scripts/deploy_remote.sh
infra/scripts/rollback_remote.sh

deploy_remote.sh should do this, in order:

ensure /app/staging exists
place compose.yml in /app/staging
place .env in /app/staging
write an image tag/version file in /app/staging
run docker compose pull
run the DB migration step explicitly
run docker compose up -d
hit /api/health
hit /api/ready
fail non-zero if any step fails

rollback_remote.sh should do this:

read the previous good image tag
restore that tag into staging env/version file
run docker compose pull
run docker compose up -d
re-run health/readiness checks

Docker’s docs support the pull plus up pattern you need here.

Step 7 — Add the PR workflow

Create:

.github/workflows/pr.yml

This workflow should run on pull requests to main.

Jobs:

checkout
setup Node
install dependencies in web
npm run lint
npm run build
start a MySQL 8.4 service container
run npm run db:migrate
run npm run db:check

Do not require Playwright yet unless you also add deterministic CI-safe tests in this phase. A flaky required job will waste time.

Step 8 — Add the staging deploy workflow

Create:

.github/workflows/deploy-staging.yml

Trigger:

push to main
workflow_dispatch

Environment:

staging

Permissions:

contents: read
packages: write

Jobs, in order:

checkout
login to GHCR
build image tagged with commit SHA
push image to GHCR
generate staging runtime .env from GitHub vars and secrets
copy compose.yml and .env to the server over SSH
run deploy_remote.sh on the server
fail the workflow if health/readiness or migration fails

GitHub documents environment secrets/variables for environment-targeted jobs, and GitHub Packages supports GITHUB_TOKEN for workflow-authenticated publishing of associated packages.

Step 9 — Add the production promotion workflow

Create:

.github/workflows/promote-prod.yml

This can be manual-only right now.

Rules:

manual dispatch only
takes an image tag or release SHA
does not rebuild
deploys the exact previously built image

That same-artifact rule is already locked in the process docs.

Step 10 — Add the Phase 7 note file

Create:

docs/rebuild/phase-7-ci-cd-pipeline.md

That file should lock:

workflow names
registry path
secret names
variable names
remote path
migration step
smoke-check endpoints
rollback method
pass/fail exit criteria
Minimum pass/fail exit criteria

Phase 7 is complete only when all of this is true:

PR workflow passes on a clean branch
merge to main builds and pushes a GHCR image
staging deploy runs from GitHub Actions only
staging uses GitHub environment secrets/vars only
DB migration runs during deploy
/api/health returns 200 after deploy
/api/ready returns 200 after deploy
staging serves the app at https://staging.mecplans101.com
rollback script exists and can restore the previous tag
no manual server edits are required to make a deploy succeed

That aligns with the project success definition: staging through GitHub Actions, no manual patching, environment-specific secrets, predictable migrations, and promotion-ready delivery.

Blind spots to avoid
Do not commit another populated env file.
Do not skip health endpoints.
Do not make prod promotion rebuild the image.
Do not let the server become the source of truth for config.
Do not add feature work before this pipeline is green.
Next phase handoff

Phase 8 should start only after staging deploy is repeatable. Then the work becomes observability: logs, traces, correlation IDs, audit events, and deployment visibility.

The next move is to generate the actual Phase 7 file set in repo-ready form: the note file, the workflow files, the Dockerfile, the compose file, and the health/readiness routes.

rebuild phases.zip
Zip Archive
Attached is the full rebuild Phase history of the core plan as well as all the corresponding chats and support chats. Revise your analysis of Phase 7 and adjust if needs be. 

I’m checking the full rebuild archive against the earlier phase trail to see whether Phase 7 needs a structural change or just tighter scope.

The added history confirms Phase 7 stays as CI/CD, but it also changes the starting assumptions: some transport secrets were already locked in Phase 3, and Phase 6 closed with staging DB secrets/hardening green. That means Phase 7 should build on those contracts instead of redefining them.

Thought for 8m 13s

I revised it.

Core answer: Phase 7 is still CI/CD, but the full rebuild history changes the starting assumptions enough that my first version needs tightening.

What changes from my prior Phase 7 analysis
1) Phase 7 should not redefine secrets from scratch

The rebuild history shows the secret contract was built in layers already:

Phase 3 locked **staging deploy transport
continue generating the revised phase 7

I’m pulling the rebuild archive into the same phase map so the revised Phase 7 is based on the actual handoff, not the earlier partial trail.

The revision is clear now: Phase 7 is deployment plumbing over the Phase 6 shell, not another environment-design phase. I’m keeping the earlier structure, but stripping out anything that Phase 3 and 6 already locked.

Thought for 4m 18s

Here is the revised Phase 7.

Phase 7 — CI/CD Pipeline
What changed from my first pass

My earlier version was directionally right, but too broad in two places.

First, it started to rebuild the secret contract from scratch. That is wrong for this project.
By the time you enter Phase 7:

Phase 3 already locked the staging deploy transport path and GitHub environment use.
Phase 6 already locked the database contract, the DB users, migration scripts, backup/restore expectation, and staging DB hardening.

So Phase 7 should consume those contracts, not redesign them.

Second, the current rebuild state shows a single real app surface: the Next.js web app with route handlers, Clerk shell, RBAC/tenant checks, and MySQL rails. So Phase 7 should deploy that. It should not invent a separate API container just because the old canon repo once had one.

Revised Phase 7 source-of-truth

Create this file in the repo:

docs/rebuild/phase-7-ci-cd-pipeline.md

Use this content model.

Goal

Build a repeatable GitHub-driven deployment path that takes the current rebuilt app from repository to staging without manual server-side patching.

Locked decisions
Phase 7 is CI/CD, not another secrets-design phase.
Existing Phase 3 transport secrets remain the transport source of truth.
Existing Phase 6 staging DB contract remains the database source of truth.
Deployments target GitHub Environment staging.
Staging deploys through GitHub Actions, not manual WinSCP patching.
The deployed runtime is the current Next.js web app.
The app is packaged as a container image and pushed to GHCR.
The staging server pulls that image and runs it with Docker Compose.
Migrations run as an explicit release step.
Deploy success requires post-deploy smoke validation.
Production must later promote the same built artifact, not a rebuilt one. GitHub documents environment-scoped deployments, and Docker/GitHub both support the build-push-pull model needed here.
Deliverables
PR validation workflow
staging deploy workflow
manual production-promotion workflow stub
Dockerfile for web
staging compose file
remote deploy script
rollback script
health endpoint
readiness endpoint
image tag/version tracking
Phase 7 notes file
Exit criteria
pull requests run validation successfully
merge or manual dispatch can build and push a staging image
staging deploy runs from GitHub Actions
server pulls the image from GHCR
migrations run during deploy
api/health returns success after deploy
api/ready returns success after deploy
staging app loads through Traefik
previous image tag can be rolled back
no manual code or env patching is required on the server for normal deploys
Not in scope
new feature build-out
observability stack
production cutover
file storage expansion
separate API/worker service split
Next phase

Phase 8 — Observability and auditability

What Phase 7 should assume is already true

Do not reopen these unless they are broken:

staging server exists
Traefik exists
TLS exists
deploy user exists
/app/staging path pattern is valid
GitHub environment structure exists
staging DB exists
DB users exist
migration scripts exist
DB secret storage approach is already chosen

That means Phase 7 starts at “package app + automate deploy”, not at “figure out infrastructure.”

Exact implementation order
Step 1 — Clean the repo surface before automation

Before adding workflows, clean the Phase 6 repo state.

Do this:

Make sure web/.env.local is not committed.
Make sure only placeholders exist in web/.env.example.
Make sure root/local-only DB files remain ignored where needed.
Make sure no staging credential value exists in tracked files.

This is not a new secrets phase. This is just removing landmines before CI starts reading from GitHub environments.

Step 2 — Lock the runtime env contract for the web app

Create or update:

web/.env.example
docs/rebuild/phase-7-ci-cd-pipeline.md

The Phase 7 app runtime contract should be narrow.

Keep using existing secret sources

Do not rename your already-established staging deploy transport secrets unless there is a real mismatch.

Do not rename your already-established Phase 6 DB secrets unless there is a real mismatch.

Add only what Phase 7 newly needs

You likely need these staging vars:

APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com
Clerk public redirect values
DATABASE_ENABLED=true
DB_SSL_REQUIRED=true or your actual staging value
DB_POOL_LIMIT=10
IMAGE_NAME=ghcr.io/flytesandbox/app-web

And these staging secrets/vars, only if not already present:

STAGING_SSH_HOST
STAGING_SSH_PORT
STAGING_SSH_USER
STAGING_SSH_PRIVATE_KEY
STAGING_SSH_KNOWN_HOSTS

GitHub environments are the right place for environment-scoped deployment configuration, secrets, and protection rules.

Step 3 — Add fail-fast server env validation

Create:

web/lib/env/server.ts

Purpose:

validate the web server runtime env before the app tries to serve real traffic
fail fast if required env is missing
distinguish between:
always-required values
values required only when DATABASE_ENABLED=true

Validate at minimum:

Clerk server key(s)
Clerk publishable key
authorized parties / allowed origin values already locked in prior phases
NEXT_PUBLIC_APP_URL
DATABASE_ENABLED
DATABASE_URL
DATABASE_MIGRATION_URL
DB_SSL_REQUIRED
DB_POOL_LIMIT

Then import this from a server-only path used at startup or first protected server execution.

Reason: CI/CD is weaker than it looks if the app can boot with broken config and only fail later under traffic.

Step 4 — Add health and readiness endpoints

Create:

web/app/api/health/route.ts
web/app/api/ready/route.ts

Use this split:

/api/health

Returns success if the process is alive.

This should not depend on MySQL.

/api/ready

Returns success only if:

env validation passes
DB connection works when DB is enabled

Why this matters:

deploy workflow needs a cheap liveness check
release gate needs a stronger readiness check

This is the minimum viable smoke-check surface for Phase 7.

Step 5 — Containerize the current app

Create:

web/Dockerfile
web/.dockerignore

Build the current app only.

Do not split services artificially.

Target shape:

install dependencies
build Next app
run next start
expose the app port used in staging
keep runtime image lean

Push to GHCR, not Docker Hub, unless you deliberately want a second external dependency. GitHub documents container publishing through Actions, and GHCR is built for this repo-linked workflow.

Step 6 — Add the staging compose file

Create:

infra/compose/staging/compose.yml
infra/compose/staging/.env.example

This compose file should define the web service only for now.

Required behavior:

image comes from GHCR
service joins the existing Traefik/edge network
service reads runtime env from /app/staging/.env
Traefik labels point to staging.mecplans101.com
app internal port matches the container runtime port
restart policy is set

Do not put DB in this compose file unless you intentionally want the staging database co-located and managed there. Phase 6 already treated DB as its own controlled concern.

Docker Compose is the right fit here because the server-side deploy pattern is “pull exact image + recreate service from declared config.”

Step 7 — Add remote deploy and rollback scripts

Create:

infra/scripts/deploy_remote.sh
infra/scripts/rollback_remote.sh

These should be the server-side release rails.

deploy_remote.sh

Sequence:

verify required files exist in /app/staging
verify Docker and Compose are available
login to GHCR if needed
pull the target image
run migration step explicitly
run docker compose up -d
wait briefly for app boot
hit /api/health
hit /api/ready
exit non-zero on any failure
rollback_remote.sh

Sequence:

resolve previous known-good image tag
write or restore that tag into the runtime env/version file
pull previous image
recreate service
rerun health/readiness checks

Docker’s documented docker compose pull and docker compose up flow is exactly the pattern you want for a tag-based remote deploy.

Step 8 — Add release metadata tracking

Create one of these:

/app/staging/version.json
or /app/staging/release.env

Track at minimum:

git SHA
image tag
deploy time
previous good tag

This matters because rollback without recorded version state turns into guesswork.

Step 9 — Add PR validation workflow

Create:

.github/workflows/pr.yml

This workflow should run on pull requests to your main integration branch.

Recommended jobs:

checkout
setup Node
install dependencies
lint
build
start MySQL service container
run db:migrate
run db:check

Then decide on tests:

Keep required PR checks narrow

Because the rebuild is still early, make required checks the stable ones first.

Recommended required set:

lint
build
db:migrate
db:check
Playwright

You already have Playwright in the current Phase 6 snapshot. Good.
But do not make it a required gate unless the tests are deterministic and already green.

Use it as:

optional initially, or
required only for one tiny smoke path

That avoids turning CI into a false blocker.

Step 10 — Add the staging deploy workflow

Create:

.github/workflows/deploy-staging.yml

Trigger:

push to main
manual dispatch

Environment:

staging

Permissions:

contents: read
packages: write

Recommended flow:

checkout
login to GHCR
build image
tag with commit SHA
push image
generate runtime .env from GitHub environment vars/secrets
copy compose.yml, env file, and release metadata to the server
execute deploy_remote.sh over SSH
fail the job if migration or smoke checks fail

GitHub’s Actions docs support environment-targeted jobs and Docker-image publishing directly from workflows.

Step 11 — Add a production promotion workflow stub

Create:

.github/workflows/promote-prod.yml

This can stay manual-only in Phase 7.

Rules:

manual dispatch only
takes an existing image tag or SHA
deploys the already-built image
does not rebuild source

That keeps you aligned with the “same artifact promoted across environments” rule already locked earlier.

Step 12 — Add one deploy-time smoke script

Create:

infra/scripts/smoke.sh

This script should do exactly two things:

call /api/health
call /api/ready

Keep it stupid-simple.

Do not turn Phase 7 smoke into a full regression suite.

Purpose:

verify process is up
verify app can actually serve with DB readiness
Recommended repo file set for Phase 7

By phase close, the repo should contain:

docs/rebuild/phase-7-ci-cd-pipeline.md
web/Dockerfile
web/.dockerignore
web/lib/env/server.ts
web/app/api/health/route.ts
web/app/api/ready/route.ts
infra/compose/staging/compose.yml
infra/compose/staging/.env.example
infra/scripts/deploy_remote.sh
infra/scripts/rollback_remote.sh
infra/scripts/smoke.sh
.github/workflows/pr.yml
.github/workflows/deploy-staging.yml
.github/workflows/promote-prod.yml
Pass / fail criteria for the revised Phase 7
Pass

Phase 7 is done only if all are true:

PR workflow runs and passes on a clean branch
merge or manual deploy builds and pushes image to GHCR
staging server pulls the image from GHCR
deploy runs from GitHub Actions
migration step runs during deploy
app becomes reachable at https://staging.mecplans101.com
/api/health succeeds
/api/ready succeeds
rollback script exists and can target the previous image tag
normal deploy no longer depends on manual WinSCP/server patching
Fail

Phase 7 is not done if any of these remain true:

deploy still depends on hand-editing files on the server
image is not registry-published
server still runs source directly instead of a promoted image
migrations are manual
smoke checks do not exist
staging deploy cannot be reproduced from GitHub Actions
rollback depends on memory instead of recorded tag/version state
Blind spots to avoid
Do not reopen phase boundaries.
Phase 7 is not the place to redesign Traefik, DB topology, or Clerk architecture.
Do not deploy source code over SSH as the main path.
Build artifact first. Then deploy artifact.
Do not rebuild for production later.
Promote the same image.
Do not skip readiness checks.
A container that starts is not the same thing as an app that is ready.
Do not make Playwright your first hard gate unless it is already stable.
Next phase handoff

Once this revised Phase 7 is green, Phase 8 becomes:

structured logs
request correlation IDs
deploy visibility
audit events
release traceability
basic metrics/troubleshooting surface

That is the right next move after deployment is repeatable.

I can generate the repo-ready Phase 7 note file plus the exact workflow/script skeletons next.