# Support Evidence Log

## Scope
- Started: 2026-03-25
- Status: in progress
- Canonical append path: docs/support/evidence/current.md

## Guardrails
- Redact secrets, passwords, private keys, full DB URLs, host fingerprints, and private IPs.
- Log repo changes, system findings, open questions, manual actions, and verification results.
- Keep this log isolated from app runtime and deployment infra.

## Entries


### 2026-03-25T18:24:09Z | change | Republished ecosystem knowledge into neutral support and wiki surfaces
- Status: captured
- Detail: Added topic-based Wiki operations docs for environment, identity, data, delivery, observability, and governance.
- Detail: Moved the active evidence tooling to docs/support/evidence and aligned AGENTS plus repo docs to the new path.
- Detail: Removed legacy launch-labeled archives and dump artifacts from the repo after the knowledge was republished.


### 2026-03-25T18:27:37Z | verify | Verified neutral ecosystem knowledge and support evidence layout
- Status: captured
- Detail: Repo-wide search found no remaining Phase, rebuild, or launch-scaffolding references in active repo paths.
- Detail: docs/wiki/archive/phase-system is absent, docs/support/evidence exists, and docs/wiki/archive/support-generated/seed-manifest.md exists.
- Detail: git diff --check reports only LF-to-CRLF working-copy warnings and no whitespace errors.


### 2026-03-30T00:00:00Z | request | Investigate 404 and unexpected server activity for Mecplans101.com
- Status: captured
- Detail: User reports HTTP 404 at Mecplans101.com and observed host activity despite no expected user traffic.

### 2026-03-30T00:00:00Z | risk | Evidence append script unavailable in this shell
- Status: captured
- Detail: docs/support/evidence/tools/append-entry.ps1 could not run because PowerShell (pwsh) is not installed in the container.
- Detail: Proceeding with manual log entry updates in docs/support/evidence/current.md to maintain required support evidence cadence.

### 2026-03-30T13:38:16Z | discovery | Staging ingress is constrained to staging subdomain only
- Status: captured
- Detail: Traefik router rule in infra/compose/staging/compose.yml only matches Host(`${STAGING_WEB_HOST}`).
- Detail: staging/compose.env sets STAGING_WEB_HOST=staging.mecplans101.com, so requests for mecplans101.com do not match the app router and return gateway 404.
- Detail: deploy guardrail in infra/scripts/deploy_remote.sh enforces STAGING_WEB_HOST must remain staging.mecplans101.com.

### 2026-03-30T13:38:21Z | change | Logged support investigation artifacts and findings
- Status: captured
- Detail: Added request, blocker, discovery, and resolution notes to docs/support/evidence/current.md per support evidence policy.

### 2026-03-30T13:38:21Z | verify | Verified likely source of server activity despite no expected user traffic
- Status: captured
- Detail: The service includes an internal healthcheck that polls /api/health every 30 seconds, which creates baseline CPU and disk/network activity even without interactive users.
- Detail: Public metrics can also include unsolicited internet scanning traffic reaching the public IP or unmatched host headers.
