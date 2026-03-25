# Environment and Platform

## Environment model

- Local is the primary development environment.
- Staging is the first remote validation environment and must behave like a
  controlled release target, not a second dev box.
- Production remains separate from staging and must not share staging identity,
  secrets, or data boundaries.

## Platform controls

- Traefik is the intended public ingress layer.
- Public exposure is limited to the expected edge ports.
- Database services stay private.
- Secrets remain environment-specific and are never committed to git.

## Host and service rules

- Docker-based service management remains the expected runtime model for the
  current remote environment.
- Staging and production should keep the same container and ingress shape even
  when capacity or scale differ.
- Environment validation must fail closed when hostnames, URLs, or secret
  contracts drift.
