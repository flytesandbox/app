# Support

`Support` is the ecosystem's dedicated logging and monitoring application.

Its scope is intentionally bounded: it exists to observe, analyze, and report
on this ecosystem without changing the application or exceeding the ecosystem's
security and operational boundaries.

## Service Charter

`Support` is responsible for:

- overall system logging and evidence collection
- error handling triage and operator-ready incident summaries
- compliance checks against the ecosystem's approved controls
- validation of best-practice update recommendations before they are adopted
- efficiency testing, benchmarking, and reporting
- threat detection and first-line response monitoring

## Architecture

### 1. Intake layer

`Support` consumes only approved ecosystem inputs, such as:

- sanitized application release, health, and readiness endpoints
- bounded operator evidence from `docs/support/evidence/`
- CI/CD workflow outcomes and deploy verification artifacts
- approved infrastructure and service telemetry exposed within the ecosystem

### 2. Normalization layer

`Support` normalizes incoming evidence into a stable internal event model with:

- timestamps and correlation identifiers
- environment and service ownership labels
- severity and confidence
- redaction state
- retention and archive eligibility

### 3. Policy and analysis layer

`Support` evaluates evidence against ecosystem-owned rules for:

- runtime failures and recurring errors
- auth, access, and compliance drift
- release-gate regressions
- efficiency regressions and bottlenecks
- threat heuristics and suspicious operator/runtime patterns
- proposed best-practice updates before they become accepted guidance

### 4. Response layer

`Support` first-line response is limited to safe actions:

- open or update an incident record
- capture and preserve evidence
- assign severity and urgency
- recommend the next operator action
- publish a sanitized report to the Wiki archive

`Support` must not:

- patch the application directly
- deploy code
- rotate secrets
- modify environment boundaries
- act outside the ecosystem it was created for

### 5. Wiki publication layer

`Support` publishes sanitized records into `docs/wiki/archive/support-generated/`
so the static Wiki becomes the durable documentation and archive surface.

## Boundary Rules

- `Support` is supportive and supplemental to the ecosystem; it must fit the
  environment rather than reshape it.
- `Support` cannot work outside this ecosystem.
- `Support` cannot make material changes to the application, environment,
  security/compliance posture, or development process.
- Active `Support` outputs must describe the current ecosystem rather than the
  tooling that originally assembled it.

See `wiki-contract.md` for the static-Wiki publication contract.
