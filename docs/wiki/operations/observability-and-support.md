# Observability and Support

## Application evidence

- Request correlation, health, readiness, and release metadata provide the
  first-line runtime evidence surface.
- Audit visibility and operator diagnostics must remain redaction-safe.

## Support evidence path

- `docs/support/evidence/` is the live append-friendly evidence path used for
  support, deployment, recovery, and ecosystem maintenance work.
- Evidence tooling must stay isolated from runtime and deployment behavior.

## Support publication

- `Support` consumes approved evidence, normalizes it, evaluates it, and
  publishes sanitized outputs into `docs/wiki/archive/support-generated/`.
- `Support` does not become a deploy tool, secret manager, or runtime control
  plane.
