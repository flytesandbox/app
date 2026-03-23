# Rebuild Log

## Scope

- Started: 2026-03-23
- Status: in progress
- Focus: Phase 7 staging deploy recovery and Phase 6 staging DB prerequisite audit
- Canonical append path: `docs/rebuild-log/current.md`

## Guardrails

- Redact secrets, passwords, private keys, full DB URLs, host fingerprints, and private IPs.
- Log repo changes, deploy/debug findings, open questions, manual actions, and verification results.
- Keep this log isolated from app runtime and deployment infra.

## Entries

### 2026-03-23 | request | Initial staging deploy failure review
- Status: captured
- Detail: User requested a review of the repo docs and staging deploy failure without making local changes.
- Detail: Reported failure: `Host key verification failed`.

### 2026-03-23 | discovery | SSH host trust failure isolated
- Status: captured
- Detail: Review of `docs/rebuild` and `.github/workflows/deploy-staging.yml` showed the deploy writes `STAGING_SSH_KNOWN_HOSTS` into `~/.ssh/known_hosts` before the first SSH call.
- Detail: Diagnosis: the failure was caused by stale or mismatched host trust material, not the deploy login key.

### 2026-03-23 | manual-action | User refreshed host trust secret
- Status: user-completed
- Detail: User updated `STAGING_SSH_KNOWN_HOSTS` in the GitHub `staging` environment.
- Detail: Result: host verification failure cleared.

### 2026-03-23 | discovery | SSH private key parse failure isolated
- Status: captured
- Detail: New failure: `Load key ... error in libcrypto`.
- Detail: Diagnosis: `STAGING_SSH_PRIVATE_KEY` was present but not stored in a runner-usable OpenSSH private key format.

### 2026-03-23 | manual-action | User refreshed deploy private key
- Status: user-completed
- Detail: User replaced the GitHub `staging` private key secret with a parseable private key value.
- Detail: Result: SSH authentication advanced to remote command execution.

### 2026-03-23 | discovery | Remote deploy reached migration step
- Status: captured
- Detail: New failure occurred inside `node ./scripts/db-migrate.mjs`.
- Detail: Stack trace showed `TypeError: Invalid URL` while parsing `DATABASE_MIGRATION_URL`.

### 2026-03-23 | question | Staging DB source of truth audit
- Status: answered
- Detail: User confirmed there is no `/app/staging/db` directory on the staging host because the environment is still being built as rails, not as a launched app.
- Detail: This contradicted the current Phase 6 notes, which marked staging DB bring-up as already completed.

### 2026-03-23 | decision | Recovery path for Phase 7
- Status: active
- Detail: Preserve the phase boundary: Phase 6 still owns staging DB bring-up.
- Detail: Correct Phase 7 so it can validate CI transport, remote deploy rails, service restart, and readiness checks with `DATABASE_ENABLED=false`.
- Detail: Add a docs-only rebuild logging system so future rebuild work gets recorded without mixing with app infra.

### 2026-03-23T17:52:52Z | change | Added rebuild logging framework and patched Phase 7 deploy rail
- Status: captured
- Detail: Created docs-only rebuild logging path under docs/rebuild-log.
- Detail: Patched deploy_remote.sh to skip explicit migration when DATABASE_ENABLED=false.
- Detail: Added workflow validation so staging DB URLs are only required when DATABASE_ENABLED=true.
- Detail: Updated Phase 6 and Phase 7 notes to record the real environment mismatch and recovery path.


### 2026-03-23T17:52:52Z | verify | Repo-side validation pass completed
- Status: completed
- Detail: Git diff whitespace check returned only expected CRLF warnings in this Windows worktree.
- Detail: Bash syntax validation could not run in the current sandbox because Git Bash failed creating its signal pipe.
- Detail: Manual inspection confirmed the deploy script change is localized to DATABASE_ENABLED parsing plus migration-step branching.


### 2026-03-23T17:53:47Z | manual-action | Operator follow-up required to finish the Phase 6 and Phase 7 recovery path
- Status: pending-user
- Detail: Set GitHub staging variable DATABASE_ENABLED=false until the real Phase 6 staging DB exists.
- Detail: Re-run Deploy Staging to validate the rails-only path: image publish, SSH transport, remote script copy, service recreation, and readiness probes.
- Detail: After Phase 6 server DB bring-up is complete, create real STAGING_DATABASE_URL and STAGING_DATABASE_MIGRATION_URL secrets and then switch DATABASE_ENABLED=true.


### 2026-03-23T18:02:01Z | request | Investigate repeated staging deploy failure after prior Phase 7 fix
- Status: captured
- Detail: Reviewed GitHub Actions failure showing remote docker compose recreate stops because the staging compose env file path resolves to a missing server-side .env.


### 2026-03-23T18:05:23Z | verify | Validated narrowed Phase 7 script fix
- Status: captured
- Detail: git diff shows only infra/scripts/deploy_remote.sh and infra/scripts/rollback_remote.sh changed for this follow-up fix.
- Detail: git diff --check reported only expected CRLF warnings in this Windows worktree and no whitespace errors.
- Detail: Git Bash parsed infra/scripts/deploy_remote.sh successfully with -n; parsing infra/scripts/rollback_remote.sh hit the repo's known Windows signal-pipe host issue, so rollback validation is based on manual diff symmetry with the deploy script plus matching structural changes.


### 2026-03-23T18:05:38Z | discovery | Compose env file mismatch isolated in remote staging deploy
- Status: captured
- Detail: The prior Phase 7 recovery commit on 2026-03-23 gated only the explicit migration rail when DATABASE_ENABLED=false.
- Detail: Current deploy_remote.sh required the runtime env file successfully before compose up, which means the server-side .env existed when the script checked it.
- Detail: The later docker compose up failure therefore points to Compose resolving APP_RUNTIME_ENV_FILE differently from the shell by re-reading compose.env rather than using the already-resolved exported environment.


### 2026-03-23T18:05:44Z | change | Patched remote deploy and rollback scripts to use one resolved Compose environment
- Status: captured
- Detail: Updated infra/scripts/deploy_remote.sh so docker compose inherits exported variables from load_compose_env instead of re-reading compose.env via --env-file.
- Detail: Added runtime env resolution helper logic so APP_RUNTIME_ENV_FILE is validated once, exported explicitly, and reused for compose pull/up plus the explicit migration step.
- Detail: Updated cleanup and rollback flows to reload restored compose.env values before recreating services, and synced IMAGE_TAG in-process after compose.env tag updates.

