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
