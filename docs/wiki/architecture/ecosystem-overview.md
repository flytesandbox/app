# Ecosystem Overview

Status: active
Date: 2026-03-25

## Purpose

Describe the current ecosystem as it exists now.

## Core System

### Application surface

- The primary product surface is the web application in `web/`.
- The app provides a public entry surface, signed-in application workspace,
  internal review queue, health/readiness visibility, and release metadata.
- Authentication is handled by Clerk.
- Authorization and tenant/resource access remain enforced by app/backend code,
  not by UI visibility alone.

### Edge and release rail

- Public ingress is intended to run through Traefik.
- GitHub Actions remains the deployment transport for staging.
- Release verification uses health, readiness, and release metadata instead of
  undocumented manual checks.
- Rollback remains a controlled operator workflow rather than ad hoc server
  patching.

### Data boundary

- MySQL is the database direction for the ecosystem.
- Each environment owns its own database identity and data boundary.
- Local uses a localhost-only MySQL bootstrap path on `127.0.0.1:3307`.
- Local seed data is deterministic and fake only.
- Local and staging must not carry real PHI.
- Database users and duties stay separated across runtime, migration, and
  backup/restore responsibilities.

## Environment Model

- Local is the primary development environment.
- Staging is the first remote validation environment and must not act like a
  second dev box.
- Production remains separate from staging and must not share staging identity
  or secrets.
- Secrets are environment-specific and are never committed to git.
- No public database port should exist in remote environments.

## Operational Evidence

- Health and readiness endpoints provide release-state and runtime checks.
- Request correlation and release metadata provide application-level evidence.
- `docs/support/evidence/` is the live operator-evidence stream that feeds
  `Support`.
- Archive material lives under `docs/wiki/archive/`.

## Supportive Services

### Wiki

- The Wiki is a static documentation surface.
- It documents the current ecosystem and stores sanitized archives.
- It does not execute runtime logic, deployments, or environment mutations.

### Support

- `Support` is a dedicated ecosystem logging and monitoring application.
- `Support` consumes bounded internal signals, evaluates them against approved
  rules, and publishes sanitized outputs.
- `Support` cannot operate outside this ecosystem and cannot become a generic
  cross-environment admin tool.

## Non-Negotiable Rules

- The ecosystem must not be materially changed just to accommodate the Wiki or
  `Support`.
- The Wiki and `Support` must remain supportive and supplemental to the
  environment they document and observe.
- Legacy scaffolding and launch mechanics must not drive active operating
  guidance.
