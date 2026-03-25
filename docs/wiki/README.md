# Ecosystem Wiki

This directory is the homegrown static documentation center for the ecosystem.

It documents the current system, the bounded role of `Support`, and the archive
surfaces that preserve support-generated records without turning the Wiki into
runtime infrastructure.

## Active Sections

- `architecture/ecosystem-overview.md` defines the current application,
  environment, security, data, and operational boundaries.
- `operations/environment-and-platform.md` defines environment separation,
  platform controls, ingress, and host expectations.
- `operations/identity-and-tenancy.md` defines identity, roles, authorization,
  and tenant boundaries.
- `operations/data-recovery-and-seed.md` defines data rules, database
  operations, backup/restore, and seed-data expectations.
- `operations/delivery-and-release.md` defines deployment, release-gate,
  rollback, and staging-mode expectations.
- `operations/observability-and-support.md` defines observability surfaces and
  the `Support` interaction model.
- `operations/governance-and-boundaries.md` defines compliance-minded
  boundaries, operational ownership, and documentation rules.
- `../support/README.md` defines the `Support` application charter and
  architecture.
- `../support/install.md` defines how to build and install `Support` without
  changing the existing application or deploy rails.
- `../support/wiki-contract.md` defines the operating rule between the static
  Wiki and the autonomous `Support` service.
- `archive/README.md` defines archive handling for `Support` outputs and
  retained service records.

## Operating Rules

- Active Wiki pages describe the current ecosystem only.
- `Support` may publish sanitized reports and manifests into
  `archive/support-generated/`.
- Wiki content must stay inside ecosystem boundaries and must not become a
  second runtime, deploy rail, or secrets store.
