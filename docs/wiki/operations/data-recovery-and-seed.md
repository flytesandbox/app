# Data, Recovery, and Seed

## Database direction

- MySQL remains the database direction for the ecosystem.
- Each environment owns its own database identity and credentials.
- Runtime, migration, and backup/restore duties stay separated.

## Data rules

- Local and staging must use fake or sanitized data only.
- Upload storage tracks metadata and references, not blob payloads inside the
  database.
- Tenant-owned tables require clear tenant ownership.

## Recovery

- Backup and restore procedures must stay documented and testable.
- Restore targets must be explicit and environment-bounded.
- Recovery proof is an operational concern, not an implied capability.

## Seed data

- Local deterministic seed data is part of the ecosystem baseline.
- Seed records must remain obviously fake and safe for local use.
- Seed documentation belongs in ecosystem operations docs rather than in a
  retired launch sequence.
