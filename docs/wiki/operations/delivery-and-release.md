# Delivery and Release

## Delivery rail

- GitHub Actions remains the controlled release transport for staging.
- Deployment should promote known artifacts and validated configuration rather
  than rely on ad hoc server patching.

## Release checks

- Health, readiness, and release metadata are required release surfaces.
- Release-gate checks must validate environment identity and expected runtime
  mode.
- Rollback remains an explicit operator action with known prior-good release
  state.

## Staging mode

- Staging may run in preview mode when a database-backed workflow is not yet
  available.
- Preview-mode limitations must be documented plainly rather than implied.
- When staging becomes database-backed, the same release checks must continue to
  hold.
