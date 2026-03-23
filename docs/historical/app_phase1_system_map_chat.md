Phase 1 System Map

Read all Project Sources completely. Begin Phase 1. 

I’m reading every uploaded source first, then I’ll lock Phase 1 into a clean source-of-truth format with the actual system map and boundaries.

I’ve got the written sources. Now I’m checking the codebase itself so Phase 1 is based on the actual repo, not just the planning docs.

Thought for 4m 55s

I read all uploaded project sources and the repo itself. The written source of truth says each phase must produce the goal, exact deliverables, source-of-truth decisions, pass/fail criteria, and next-phase handoff, and Phase 1 specifically must define users, roles, tenants, services, databases, third parties, regulated data, and boundaries.

One hard truth before the map: the uploaded repo already has useful ICHRA work in it, but it is still shaped around legacy assumptions: Node API, Nginx web container, Postgres persistence, and OIDC-style auth. Your rebuild target is different: GitHub, Linode, Clerk, Traefik, controlled secrets, staged deployment, and owner-operable step-by-step delivery. That mismatch is the main source of drift and confusion right now.

Phase 1 — System Map
Goal

Lock the actual system boundary before any more build decisions so the rebuild stops mixing old repo assumptions with the new target operating model. The app is a two-surface ICHRA platform: a public employer setup flow and an internal admin review flow.

Exact deliverables

This phase delivers:

locked product scope
locked user/role map
locked tenant model
locked service map
locked data classification
locked system boundaries
locked shared-responsibility split
pass/fail criteria for Phase 1
Source-of-truth decisions
1) Rebuild target wins over legacy repo shape

The current repo is reference material, not architecture truth. Reuse good ideas from it, but do not let Postgres/OIDC/legacy modular scope silently define the rebuild.

2) MVP product scope is narrow on purpose

The rebuild is only for:

public employer ICHRA setup
internal admin review and processing

Anything outside that is out of scope until later phases. That keeps this owner-operable.

3) Authentication and authorization are separate

Clerk handles authentication. Your backend handles authorization, tenant isolation, role permissions, resource ownership, and action-level checks. Frontend visibility is never the security boundary.

4) Staging is not a second dev box

The rebuild must preserve production-like staging, fail-closed configuration, and same-artifact promotion across environments.

5) Regulated data stays out of local by default

Local uses fake/test-safe data only. Staging uses no real PHI unless explicitly approved and governed. Logs must never contain PHI, full tokens, passwords, session secrets, or raw authorization headers.

6) The rebuild should stay simple at launch

Use the minimum set of services required to run the product safely. Do not force extra personas, extra microservices, or extra runtimes into the MVP just because they existed in prior scaffolding.

System map
A) Product surfaces
Public surface
employer-facing ICHRA setup wizard
draft save/resume
file upload
review-before-submit
submit application
Internal surface
admin login/authenticated access
submitted application list
application detail review
approve/deactivate actions
file download/review

This matches the stated rebuild objective and current repo behavior.

B) Users and personas
Public applicant
employer owner/admin or delegated company contact completing setup
Secondary contact
payroll/compliance/billing contact captured during setup
Internal ops reviewer
staff reviewing, approving, or deactivating applications
Platform admin
limited higher-privilege internal user for support, access, and release oversight
Service account
CI/CD, deployment, internal automation
Broker/agent
captured as application data in MVP
not a first-class authenticated user in initial rebuild
C) Roles

Lock these as the initial role set:

anonymous_public
draft_holder
internal_ops
platform_admin
service_account
read_only_auditor later, not day 1

Why this role set:

it fits the actual app
it avoids dragging legacy association/member/advisor models into the rebuild
it stays aligned with the backend-enforced RBAC pattern in the source docs
D) Tenant model

Initial tenant boundary:

one employer/application organization = one tenant boundary

Rules:

each employer application belongs to one tenant scope
internal users can cross tenant boundaries only by explicit internal role and scope
public draft access is not a role; it is a constrained token-based access path to one application only
legacy “association/member/advisor” domain scope is not Phase 1 truth for this rebuild
E) Core services

Lock these services:

Edge/ingress
Traefik
TLS termination
routing
security middleware
version endpoint exposure
Web app
public wizard
admin UI shell
Clerk frontend integration later
API
application CRUD
validation
authorization
upload handling
admin actions
health/readiness
Worker
optional at launch
later for email, async jobs, document processing
Auth provider
Clerk
Database
private-only application data tier
CI/CD
GitHub Actions + registry + staged promotion

This follows the target operating model in the sources.

F) Datastores

Lock these as data zones, even if some start as logical separation before physical separation:

Application data zone
public and tenant-facing application records
Internal ops zone
admin workflow metadata
support notes
operational state
Audit/event zone
security events
auth events
role changes
exports
sensitive actions
Upload/document store
all uploaded files
must stay behind API boundary
exact storage method gets finalized in Phase 6, not now

This aligns with the source requirement for a 3-zone data model.

G) Third parties and external systems

In scope:

GitHub
GitHub Actions / image registry
Linode
Clerk
Traefik / Let’s Encrypt
DNS provider
future email provider
future backup/observability vendors

Not production dependencies, but part of your operating workflow:

VS Code
Codex
WinSCP
H) Data classification

Lock this classification now:

Public
marketing pages
static assets
public app shell
version endpoints
Internal
deployment metadata
runbooks
internal operational notes
non-secret environment documentation
Sensitive
secrets
SSH material
DB credentials
draft resume tokens
admin-only operational data
Regulated
submitted ICHRA application payloads
contact PII
uploaded files
any health/insurance-related content
any future employee coverage or reimbursement data

Source docs require a Public / Internal / Sensitive / Regulated split and specifically call out PHI handling as a Phase 1 boundary question.

I) Regulated data flows

Lock these flows:

Public applicant → web → API → app DB / upload store
Internal ops → admin UI → API → app DB / upload store
Clerk → app auth context → backend authorization checks
CI/CD → deploy infrastructure only, never PHI payload handling
Logs/metrics/audit → redacted operational data only
J) Boundary rules

Non-negotiable:

DB is private only
no direct DB exposure to internet
admin actions require authenticated backend checks
public draft access requires constrained token access
Clerk is authN only; backend is authZ
no real PHI in local
no real PHI in staging unless explicitly approved
staging must mirror prod behavior
deploys happen through CI, not ad hoc server edits

These are directly aligned with the source rules.

K) Shared responsibility split

Clerk

identity proof
sessions
MFA
auth plumbing

Linode / host layer

server boundary
VM/network posture
storage/compute availability

App layer

authorization
tenant isolation
data validation
upload controls
logging redaction
audit events
release logic
business rules

GitHub / CI

build/publish/promote
secret injection for deploy
no PHI storage in repo, issues, artifacts, or logs
Biggest blind spots I’m calling out now
Repo drift
current repo leans Postgres/OIDC
rebuild target leans MySQL/Clerk
if you do not lock this, every later phase will drift again
Legacy scope contamination
the old association/member/advisor architecture is broader than this rebuild
it should not drive the ICHRA MVP
Upload storage is not yet locked
current repo stores uploads in DB
that is not automatically the right final decision
Email/notification vendor is still undefined
that matters later for saved-link delivery, notices, and admin workflows
Pass / fail exit criteria

Phase 1 passes only if these are now answerable:

what data is regulated
where that data may live
which vendors need contract/BAA review
which environments may contain real PHI
which logs may never contain PHI
what the actual product scope is
who the real users are
what roles exist
what the tenant boundary is
what is explicitly out of scope

Those are the exact exit questions required by the source docs.

Next phase handoff
Phase 2 — Environment map

Lock next:

actual hostnames
DNS records
local vs staging vs prod behavior
deploy paths on Linode
SSH users and key ownership
secret sources by environment
database placement
whether dev and staging share a VM or split now
exact staging mapping for staging.mecplans101.com and its API host
What Phase 2 must not do
no feature work
no auth implementation
no CI changes yet
no database schema work yet

It only locks the environment map.

If you want, I’ll move straight into Phase 2 in the next message.

all I have in place atm is the server with the dns records pointing to it. You were supposed to generate step by step instructions for setting each item up. Read the Source material. 

You’re right. I answered with a map when the source material called for executable setup steps. I’m re-reading the project docs and the repo artifacts now so I can turn Phase 1 into a build sequence from your actual starting point: server plus DNS.

I found the disconnect. The sources do want phase outputs, but they also require owner-operable, clear beginning-to-end instructions, and your developer note explicitly says “do this, then this” with no noise.

Thought for 4m 10s

You were right. I answered at the wrong level.

The source material says each phase must produce the goal, exact deliverables, source-of-truth decisions, pass/fail criteria, and next-phase handoff, and it also says this rebuild must be owner-operable and written as clear step-by-step instructions.

It also makes the order explicit: Phase 1 is the system map, Phase 2 is the environment map, and Phase 3 is the first server-setup phase.

So the correct answer for where you are now is this:

In Phase 1, do not configure the server yet.
Phase 1 is where you lock the system map so the later setup steps do not drift.

Do this now
In your rebuild repo, create this file:
/docs/rebuild/phase-1-system-map.md
Paste the content below into that file.
Commit it with this message:
docs: lock phase 1 system map
Stop there for this phase.
Do not install Traefik, Clerk, MySQL, TLS, or GitHub Actions yet.
# Phase 1 — System Map

## Goal
Lock the system boundary for the rebuild before any environment or server setup work.

## Current starting point
- One Linode server exists.
- DNS records already point to that server.
- No locked staging deployment contract exists yet.
- No locked environment map exists yet.
- No locked secrets contract exists yet for the rebuild.
- No locked private MySQL runtime exists yet for the rebuild.

## Exact deliverables
This phase defines:
- users
- roles
- tenant model
- services
- databases/data zones
- third parties
- regulated data
- system boundaries
- shared responsibility
- explicit out-of-scope items

## Source-of-truth decisions

### 1) Rebuild target overrides legacy repo assumptions
The old repo contains useful lessons, but it is not the architecture truth for the rebuild.

Do not let these legacy assumptions drive the new build:
- Postgres as the final DB default
- OIDC as the final auth default
- Nginx as the final edge/proxy default

The rebuild target is:
- Traefik at the edge
- Clerk for authentication
- backend-enforced authorization
- MySQL private only
- GitHub-driven CI/CD
- local, staging, and production as separate environments

### 2) Product scope for this rebuild
This app has two primary experiences:

#### Public experience
An employer-facing ICHRA setup flow that allows:
- multi-step application entry
- save and resume
- file upload
- review before submit
- final submission

#### Internal experience
An internal/admin review flow that allows:
- secure sign-in
- review of submitted applications
- detail inspection
- file review
- processing actions by authorized staff

### 3) Users
The system will support these user types:

- Public applicant
  - employer owner, HR contact, or authorized company contact completing setup
- Internal operations user
  - staff reviewing and processing submitted applications
- Platform admin
  - higher-trust internal user for access, release, and support oversight
- Service account
  - CI/CD and controlled automation identity
- Read-only auditor
  - non-operational internal reviewer for later phases

### 4) Roles
Initial role set for the rebuild:
- `public_applicant`
- `internal_ops`
- `platform_admin`
- `read_only_auditor`
- `service_account`

Rules:
- Clerk authenticates users.
- Clerk is not the final source of truth for authorization.
- The backend must enforce:
  - role permissions
  - tenant boundaries
  - resource ownership
  - action-level checks

### 5) Tenant model
Initial tenant boundary:
- one employer/application organization = one tenant boundary

Rules:
- each application belongs to exactly one tenant
- internal users may cross tenant boundaries only through backend-enforced role/scope rules
- public save/resume access is constrained to a single application context
- tenant isolation is enforced in backend logic and data access rules

### 6) Services
The rebuild uses these core services:

#### Edge
- Traefik
- HTTPS redirect
- TLS termination
- routing by host/path
- security middleware
- rate limiting
- admin path restrictions later

#### App tier
- web application
- API service
- optional worker/background job service

#### Identity
- Clerk for sign-in/session/authentication

#### Data tier
- MySQL private only
- separate environment-specific databases
- audit/event storage pattern
- uploaded file storage path to be finalized in a later phase

#### Delivery/control tier
- GitHub
- GitHub Actions
- container registry
- environment-specific deploy credentials

### 7) Data zones
Use a 3-zone data model:

#### External application data zone
- tenant-facing application data
- application records
- workflow state tied to applicant submissions

#### Internal operations data zone
- admin workflow metadata
- support notes
- internal processing state

#### Audit/event zone
- auth events
- role changes
- exports/downloads
- sensitive actions
- deployment events
- security events

### 8) Data classification
All system data must be classified into one of these classes:

#### Public
- public app shell
- static assets
- public route content with no applicant data

#### Internal
- operational docs
- deployment runbooks
- non-secret architecture docs

#### Sensitive
- secrets
- deploy credentials
- SSH material
- DB credentials
- saved-link tokens
- internal admin metadata

#### Regulated
- application payloads
- applicant and contact PII
- uploaded documents
- insurance/benefits-related data
- any future PHI-bearing data

### 9) Environment data rules
- Local/dev: fake or test-safe data only
- Staging: production-like architecture, but no real PHI unless explicitly approved and governed
- Production: only environment intended for real regulated data

### 10) Logs must never contain
- PHI payloads
- full tokens
- passwords
- session secrets
- raw authorization headers

### 11) Third parties in scope
Third parties in scope for this rebuild:
- Linode
- GitHub
- GitHub Actions / registry
- Clerk
- DNS provider
- WinSCP
- VS Code
- Codex
- future email provider
- future backup/storage provider
- future observability provider

### 12) Vendor review boundary
Treat vendors in two groups:

#### PHI-path vendors
Any vendor that stores, processes, routes, or can access regulated production data must be reviewed before production use.

Expected PHI-path vendor categories:
- hosting/server provider
- auth provider
- database/storage provider
- email provider if notifications include regulated data
- backup provider
- observability/logging provider if regulated data could reach it

#### Non-PHI-path vendors
These may be in the delivery toolchain without holding regulated application data:
- GitHub source control
- local editor/tools
- CI orchestration only
- DNS management only

Rule:
No PHI is allowed into a vendor path until that path is intentionally approved.

### 13) Shared responsibility matrix

#### Clerk handles
- authentication
- user/session lifecycle
- MFA capabilities
- token issuance

#### Server/cloud layer handles
- VM/network boundary
- OS posture
- storage/compute availability
- host access controls
- private network posture

#### App layer handles
- authorization
- tenant isolation
- resource ownership checks
- request validation
- audit events
- logging redaction
- business rules
- controlled access to regulated data

#### CI/CD layer handles
- build
- artifact publication
- deployment
- environment-scoped secret injection

Rule:
CI/CD must never become a storage path for regulated data.

### 14) Network/system boundary
- Public internet reaches Traefik only
- App services sit behind Traefik
- Database is private only
- No direct database exposure to the internet
- Admin operations require authenticated backend checks
- Internal-only services are not directly public

### 15) Explicit out-of-scope items for Phase 1
Not part of this phase:
- server hardening
- Traefik installation
- TLS setup
- Clerk installation
- MySQL installation
- CI/CD setup
- feature rebuild
- production deployment

## Pass / fail exit criteria

Phase 1 passes only if all of these are answered:
- What data is regulated?
- Where can that data live?
- Which vendors are in scope for regulated-data review?
- Which environments may contain real PHI?
- Which logs may never contain PHI?
- What are the system users?
- What are the initial roles?
- What is the tenant boundary?
- What services exist?
- What is explicitly out of scope right now?

## Next phase handoff
Phase 2 is the environment map.

Phase 2 must define:
- local
- staging
- production
- hostnames
- DNS usage
- deploy paths
- secret sources
- environment separation rules

Phase 2 will be the first phase that turns your current server + DNS situation into a concrete deployment layout.
Why this is the correct move

The docs are explicit that the rebuild should be done in this order: system map, then environment map, then platform controls, then identity, then data, then CI/CD, then observability, then feature work.

They also define the target operating model as Traefik at the edge, Clerk for auth, MySQL private only, separate environments, controlled secrets, and CI/CD-driven deployment.

And they explicitly say local should use fake/test-safe data, staging should mirror production behavior, and logs must never contain PHI, full tokens, passwords, session secrets, or raw authorization headers.

One important warning from the repo review: the old codebase still carries legacy assumptions around Postgres, OIDC, and older edge/container patterns. Do not let that silently define the rebuild. The rebuild target is different on purpose.

Next message, I’ll do Phase 2 as exact step-by-step environment setup instructions from your real starting point: one server and DNS already pointed at it.

Done. I deleted the old repo in github (github.com/flytesandbox/app) and created a new one at: github.com/flytesandbox/app.

In the new repo is docs/rebuild.phase-1-system-map.md, and it contains the text above. 

What is next in phase 1. 

I’m checking the source docs against what you already completed so I can tell you whether Phase 1 has another task or whether it should be formally closed and handed off.

Thought for 38s

There is only one thing left in Phase 1:

Close the phase by adding the Phase 1 exit answers and required controls baseline to the file.

That matches the source material. Phase 1 is the system map, and it is not done until the phase output includes the phase goal, deliverables, source-of-truth decisions, pass/fail exit criteria, and next-phase handoff. The Phase 1 gate also says you should be able to answer: what data is regulated, where it can live, which vendors require a BAA or equivalent, which environments may contain real PHI, and which logs may never contain PHI.

Do this:

1) Open your Phase 1 file

Open the file you already created in the new repo.

2) Add this at the bottom
## Required controls baseline

The following controls are required for this rebuild and are now part of the Phase 1 source of truth:

- Access control
- Encryption
- Audit logging
- Backup and restore
- Incident response
- Change management
- Vulnerability management
- Vendor management
- Least privilege

These controls are not optional future add-ons.
They are part of the operating model and must be implemented in later phases.

## Phase 1 exit answers

### What data is regulated?
Regulated data includes:
- employer application data
- contact PII
- uploaded documents
- benefits/insurance-related submission data
- any future PHI-bearing data

### Where can that data live?
Regulated data may live only in approved system paths:
- production application services
- production database/storage
- approved backup paths
- approved vendor paths that are intentionally allowed

Regulated data may not be stored in:
- local development
- casual test files
- repo contents
- CI logs
- unmanaged third-party tools

### Which vendors require a BAA or equivalent review?
Any vendor that stores, processes, routes, or can access regulated production data must be reviewed before use.

Expected review candidates:
- hosting/server provider
- auth provider
- database/storage provider
- backup provider
- observability/logging provider
- email provider if it handles regulated content

### Which environments may contain real PHI?
- Local/dev: no
- Staging: no, unless explicitly approved and governed
- Production: yes

### Which logs may never contain PHI?
The following must never appear in logs:
- PHI payloads
- full tokens
- passwords
- session secrets
- raw authorization headers

## Phase 1 completion status

Phase 1 is complete when:
- the system boundary is defined
- users and roles are defined
- tenant model is defined
- services and data zones are defined
- third parties are identified
- regulated data rules are defined
- exit answers above are present in this file

## Next phase handoff

Next is Phase 2 — Environment map.

Phase 2 will define:
- local
- staging
- production
- hostnames
- DNS usage
- deploy paths
- secret sources
- environment separation rules
3) Commit it

Use this commit message:

git add .
git commit -m "docs: close phase 1 system map"
git push origin main
4) Stop Phase 1 there

Do not set up the server yet.
Do not install Traefik yet.
Do not install Clerk yet.
Do not set up MySQL yet.

The source order is clear: system map first, then environment map, then platform controls.

5) After that, Phase 1 is done

The next thing is Phase 2, not another technical setup task inside Phase 1. The docs are explicit that Step 1 is the system map and Step 2 is the environment map.

Your source instructions also require very clear step-by-step execution, so I’m keeping this tight and sequential.

After you do that, I’ll give you the exact Phase 2 environment map instructions from your real starting point: one server already live and DNS already pointed to it.