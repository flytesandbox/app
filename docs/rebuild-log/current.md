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


### 2026-03-23T18:11:39Z | discovery | Confirmed current deploy failure occurs on already-patched commit be7b99c
- Status: captured
- Detail: Git history shows origin/main and HEAD at be7b99c (debug db error), so the repeated staging failure is not a rerun of the pre-fix workflow.
- Detail: Current tree already includes the follow-up deploy_remote.sh and rollback_remote.sh changes intended to resolve APP_RUNTIME_ENV_FILE handling during docker compose up.


### 2026-03-23T18:14:20Z | discovery | Relative runtime env path with explicit Compose project directory resolves cleanly
- Status: captured
- Detail: Local docker compose config succeeds when APP_RUNTIME_ENV_FILE is provided via exported environment instead of --env-file, confirming the prior patch narrowed the problem but not the remaining server failure.
- Detail: Local docker compose config also succeeds with APP_RUNTIME_ENV_FILE set to a relative path and --project-directory pinned to the staging directory, which removes ambiguity about where Compose should resolve the runtime env file.


### 2026-03-23T18:16:09Z | manual-action | Operator rerun required for staging deploy validation
- Status: captured
- Detail: Push the current branch and rerun the GitHub Deploy Staging workflow on commit be7b99c successor containing the relative APP_RUNTIME_ENV_FILE patch.
- Detail: If the rerun still fails, capture the full remote deploy section including any new lines immediately before and after docker compose up so the remaining server-side state can be isolated.


### 2026-03-23T18:16:09Z | change | Hardened staging compose runtime env resolution to use deploy-root-relative paths
- Status: captured
- Detail: Updated deploy-staging workflow generation so staging compose.env now writes APP_RUNTIME_ENV_FILE=.env instead of an absolute server path.
- Detail: Patched deploy_remote.sh and rollback_remote.sh to pin docker compose to --project-directory APP_ROOT and resolve runtime env files relative to APP_ROOT for script-side validation and migration execution.
- Detail: Updated staging example/config docs to reflect that real staging now uses .env relative to /app/staging instead of embedding an absolute path in compose.env.


### 2026-03-23T18:16:09Z | verify | Repo-side validation passed for relative runtime env path hardening
- Status: captured
- Detail: docker compose config succeeded with APP_RUNTIME_ENV_FILE=.env when --project-directory was pinned to a staging-shaped directory, confirming the relative server path model resolves cleanly.
- Detail: docker compose config also still succeeded for the local placeholder validation path ./runtime.env.example under the compose example directory.
- Detail: git diff --check reported only expected Windows CRLF conversion warnings and no whitespace errors.
- Detail: Git Bash syntax checks could not complete in this host sandbox because bash.exe failed creating its Windows signal resources, so shell-script verification is limited to manual diff review plus the compose resolution checks above.


### 2026-03-23T18:27:12Z | request | Review recent staging deploy tasks after Action stalled at remote health probe
- Status: Review scope is the last few Phase 7 staging deploy fixes to verify they still align with the goal of a successful staging CI deploy while DATABASE_ENABLED=false.
- Detail: User reported the GitHub Action reached deploy_remote.sh, recreated the container, and stalled after '[deploy] probing /api/health'.


### 2026-03-23T18:28:23Z | request | User prompts summary: staging deploy probe stall review
- Status: captured
- Detail: User reported the GitHub staging deploy now reaches remote service recreation and then stalls during the health-probe stage.
- Detail: User asked for a review of the most recent staging deploy tasks to confirm the work is still aligned with the Phase 7 goal.
- Detail: User later provided a curl timeout on port 443 and requested a short, high-level change-log update summarizing these prompts.


### 2026-03-23T18:34:36Z | request | Review recurring staging deploy error after last task
- Status: captured
- Detail: User reported the same staging deploy error occurred again after the most recent task and requested a full review with expanded research for solutions.,Starting from the latest logged staging deploy follow-up and current HEAD 005113a to identify whether the repeated failure is a regression, an unhandled server state, or an observability gap.


### 2026-03-23T18:37:15Z | discovery | Recurring staging stall traced to unbounded ingress probe and accidental stray repo file
- Status: captured
- Detail: Review of HEAD 005113a found an accidental tracked file under web/app/api/health containing rebuild-log text instead of a code change, so the last task also left repo hygiene issues behind.,infra/scripts/deploy_remote.sh and rollback_remote.sh probe https://STAGING_WEB_HOST on port 443 via curl --resolve without curl connect or max timeouts, so a black-holed 127.0.0.1:443 path can stall far longer than the script's intended retry budget.,Primary-source check confirms curl --resolve only overrides host-to-address resolution while still connecting to the specified host:port pair, and curl documents --connect-timeout plus --max-time as the controls that prevent hangs during slow or unreachable transfers.


### 2026-03-23T18:40:52Z | change | Hardened staging probe flow and removed accidental stray file
- Status: captured
- Detail: Patched infra/scripts/deploy_remote.sh and infra/scripts/rollback_remote.sh to wait for container health separately from ingress checks, bound curl probe time with PROBE_CONNECT_TIMEOUT and PROBE_MAX_TIME, and emit docker ps/log diagnostics on failure.
- Detail: Updated .github/workflows/deploy-staging.yml so optional GitHub staging variables can override probe scheme, port, IP, and curl timeout settings without another repo change.
- Detail: Removed the accidental tracked rebuild-log text file under web/app/api/health that was created by the prior task instead of a code change.


### 2026-03-23T18:40:52Z | verify | Repo-side validation completed for recurring probe failure hardening
- Status: captured
- Detail: git diff --check reported only expected Windows CRLF conversion warnings and no whitespace errors.
- Detail: Git Bash syntax validation succeeded for infra/scripts/deploy_remote.sh.
- Detail: Git Bash syntax validation for infra/scripts/rollback_remote.sh could not complete on this host because bash.exe hit the repo's known Windows signal-pipe error, so rollback validation is limited to mirrored diff review plus the successful deploy script syntax check.


### 2026-03-24T14:10:30Z | request | User requested end-to-end review of repeated staging deploy error and asked whether this is one persistent failure or a series of failures.
- Status: captured
- Detail: Current deploy log shows container health stuck in starting state and repeated instrumentation-hook failure for NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY format validation.


### 2026-03-24T14:16:59Z | discovery | Staging Clerk was never provisioned.
- Status: captured
- Detail: User confirmed only the development Clerk side was configured during prior setup/testing.
- Detail: This explains why the staging deploy reached runtime and then failed env validation for NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.


### 2026-03-24T14:17:05Z | change | Added fail-fast staging Clerk/runtime validation before service replacement.
- Status: captured
- Detail: Updated .github/workflows/deploy-staging.yml to validate Clerk keys, JWT key, app URL, and authorized parties before build/push.
- Detail: Updated infra/scripts/deploy_remote.sh and infra/scripts/rollback_remote.sh to validate the transferred runtime auth contract before compose pull/up.
- Detail: Updated docs/rebuild/phase-7-ci-cd-pipeline.md to record the missing staging Clerk prerequisite and the new validation rail.


### 2026-03-24T14:17:12Z | verify | Validated the new staging Clerk/runtime guardrails locally.
- Status: captured
- Detail: git diff --check reported only expected Windows CRLF warnings and no whitespace errors.
- Detail: Git Bash syntax validation passed for infra/scripts/deploy_remote.sh.
- Detail: Git Bash syntax validation for infra/scripts/rollback_remote.sh hit the repo's known Windows signal-pipe host issue, so rollback verification is based on mirrored diff review plus identical validation logic structure.
- Detail: A local PowerShell execution of the new workflow-side validation logic passed with representative staging-shaped inputs.


### 2026-03-24T14:17:20Z | manual-action | Operator must provision Clerk for staging before rerunning deploy.
- Status: captured
- Detail: Create/configure the staging Clerk application and domain for staging.mecplans101.com.
- Detail: Populate GitHub staging secrets NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, and CLERK_JWT_KEY from that staging Clerk setup.
- Detail: Re-run Deploy Staging; the workflow will now fail early if those Clerk values are missing, quoted, or mismatched.


### 2026-03-24T14:34:17Z | request | Review latest staging Clerk failure and prepare operator-facing fix instructions
- Status: captured
- Detail: User provided a staging deploy log showing runtime failure on NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY validation.
- Detail: Need to confirm whether the repo already contains a fix and produce non-developer steps to correct the staging Clerk configuration.


### 2026-03-24T14:34:49Z | discovery | Latest failed deploy ran without the local Clerk guardrail patch
- Status: captured
- Detail: Git status shows local edits in deploy-staging workflow, deploy/rollback scripts, and Phase 7 docs that add fail-fast Clerk/runtime validation.
- Detail: The failed staging deploy used commit f6ffdfec9b5788d640fba95935b6e19726f13b88, so GitHub Actions did not yet include these local-only changes.
- Detail: The runtime error remains a configuration failure: staging runtime received an invalid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY value rather than a real pk_test_ or pk_live_ key.


### 2026-03-24T14:36:44Z | change | Added staging Clerk operator runbook and clearer validation guidance
- Status: captured
- Detail: Created docs/rebuild/staging-clerk-recovery.md with plain-language steps for Clerk dashboard setup, GitHub staging secret updates, and validation checks.
- Detail: Updated docs/rebuild/phase-7-ci-cd-pipeline.md to point operators to the dedicated staging Clerk recovery guide.
- Detail: Clarified Clerk validation errors in deploy-staging workflow, remote deploy/rollback scripts, and web/lib/env/server.ts so future failures tell the operator to use real staging Clerk values without quotes.


### 2026-03-24T14:38:39Z | verify | Verified staging Clerk recovery updates and recorded remaining local-only requirement
- Status: captured
- Detail: npm run lint -- lib/env/server.ts passed in c:\\Dev\\Repos\\app\\web after the runtime-message update.
- Detail: git diff --check reported only expected Windows CRLF warnings and no whitespace errors.
- Detail: bash -n verification for deploy_remote.sh and rollback_remote.sh could not run on this host because /bin/bash is unavailable, so shell verification is limited to mirrored diff review and message-only edits on top of the existing guardrail patch.
- Detail: The fail-fast Clerk validation and new operator runbook are still local working-tree changes until they are committed and pushed before the next staging deploy.


### 2026-03-24T14:58:18Z | request | Analyze latest staging deploy ingress probe failure
- Status: captured
- Detail: User provided staging deploy output where deploy_remote.sh pulled and recreated the container, then failed health probing with curl timeouts to 0.0.0.1:443 on /api/health.
- Detail: Reviewing the committed staging workflow, remote deploy script, compose healthcheck, and existing rebuild-log history to isolate whether this is an app failure, ingress failure, or bad probe configuration.


### 2026-03-24T14:58:47Z | discovery | Staging deploy probe failure points to bad ingress probe IP override
- Status: captured
- Detail: infra/scripts/deploy_remote.sh defaults PROBE_IP to 127.0.0.1 and uses curl --resolve STAGING_WEB_HOST:PROBE_PORT:PROBE_IP for ingress probes.
- Detail: .github/workflows/deploy-staging.yml forwards the optional GitHub variable STAGING_PROBE_IP into PROBE_IP only when that variable is non-empty.
- Detail: Repo search found no literal 0.0.0.1, so the observed curl target 0.0.0.1:443 is most likely coming from an external staging variable/manual export rather than source-controlled defaults.
- Detail: Because the log reached container recreation, start, and probe attempts, the failure is later than image pull/container startup and is specifically the ingress health check target.


### 2026-03-24T14:58:56Z | verify | Repo-side verification completed for ingress probe failure analysis
- Status: captured
- Detail: Confirmed current staged compose file defines an internal container healthcheck against http://127.0.0.1:/api/health, which is separate from the failing host-level ingress probe to https://STAGING_WEB_HOST via curl --resolve.
- Detail: Confirmed staging/compose.env only carries STAGING_WEB_HOST and no probe IP override, so repo-side deploy defaults do not explain a 0.0.0.1 target.
- Detail: Verification is limited to source inspection and log correlation because this session cannot SSH into the staging host or read GitHub environment variables directly.


### 2026-03-24T14:59:11Z | discovery | Correction: staging compose healthcheck remains container-local on port 3000
- Status: captured
- Detail: The staging compose file healthcheck uses wget against http://127.0.0.1:3000/api/health inside the container, reinforcing that the observed failure is not the container-local healthcheck path but the separate host-level ingress probe.


### 2026-03-24T15:09:10Z | decision | Harden staging deploy against stray remote probe environment variables
- Status: captured
- Detail: Because STAGING_PROBE_IP is absent from GitHub variables yet curl still targets 0.0.0.1, the remaining plausible source is inherited remote shell environment state such as PROBE_IP exported by a profile or prior operator configuration.
- Detail: Patch the workflow to unset inherited PROBE_SCHEME/PORT/IP/timeouts before optionally exporting GitHub-controlled overrides, and patch deploy/rollback scripts to log the effective probe target and fail fast on invalid 0.0.0.0/8 probe IPs.


### 2026-03-24T15:10:03Z | discovery | Direct host curl reaches Traefik but no staging router matches
- Status: captured
- Detail: User-provided host checks show 127.0.0.1:443 is listening and curl --resolve staging.mecplans101.com:443:127.0.0.1 reaches Traefik successfully.
- Detail: The response is HTTP 404 with CN=TRAEFIK DEFAULT CERT rather than a timeout or app response, which indicates the request reached the reverse proxy but no router/service matched Host(staging.mecplans101.com).
- Detail: That shifts the failure from bad probe reachability to missing or ignored Traefik routing for the app-staging-web container.


### 2026-03-24T15:10:48Z | change | Hardened staging probe execution against inherited remote shell state
- Status: captured
- Detail: Updated .github/workflows/deploy-staging.yml so the remote SSH block unsets inherited PROBE_SCHEME, PROBE_PORT, PROBE_IP, PROBE_CONNECT_TIMEOUT, and PROBE_MAX_TIME before applying any GitHub-controlled overrides.
- Detail: Updated infra/scripts/deploy_remote.sh and infra/scripts/rollback_remote.sh to treat empty probe env values as unset, log the effective ingress probe target, and fail fast if PROBE_IP is set to an invalid 0.0.0.0/8 address such as 0.0.0.1.


### 2026-03-24T15:10:48Z | verify | Verified probe hardening patch with local diff checks
- Status: captured
- Detail: git diff --check on the patched workflow and deploy scripts reported only the existing CRLF warnings and no whitespace errors.
- Detail: A local bash -n parse check could not run in this host environment because invoking bash returned Access is denied, so script verification is limited to diff review and the minimal textual scope of the patch.


### 2026-03-24T15:14:56Z | request | Perform repo-wide environment-boundary hardening audit
- Status: captured
- Detail: User requested a deep analysis of setup vision, phase system, current project facets, CI pipeline, server-side deploy path, and boundary controls so development-only content/data cannot transition to staging and staging cannot transition to production.
- Detail: Starting with a repo-wide audit of workflows, infra, runtime env validation, phase/rebuild docs, and existing environment-specific contracts before applying guardrail changes.


### 2026-03-24T15:19:54Z | discovery | Environment-boundary audit found enforcement gaps between repo policy and runtime/deploy rails
- Status: captured
- Detail: Phase 1 and Phase 2 docs lock separate local, staging, and prod identities with fake/sanitized-only data outside production, but current runtime validation does not read APP_ENV and therefore does not enforce environment identity at startup.
- Detail: PR validation intentionally uses CI-local loopback URLs and test auth placeholders, which is acceptable for CI, but the app/runtime rails currently do not independently prevent local-style origins or DB hosts from being reused in staging/prod.
- Detail: The PHASE5_TEST_AUTH bypass is gated only by an env var, so an accidental enablement outside local/CI would weaken route protection.
- Detail: Staging deploy workflow and remote scripts validate formatting and required values, but they do not yet require APP_ENV=staging, tie NEXT_PUBLIC_APP_URL to STAGING_WEB_HOST, or reject local-style database hosts for staging.
- Detail: The repo currently has no production deploy workflow or production compose path, so staging-to-production separation is documented but not yet implemented as executable repo rail.


### 2026-03-24T15:23:05Z | change | Begin environment-boundary hardening edit batch
- Status: captured
- Detail: Applying runtime APP_ENV boundary validation, DB host/name rails, test-auth gating, stronger staging workflow/deploy checks, a repo boundary audit script, and updated example/docs files so local/CI/staging identities are enforced in code and CI rather than only documented.


### 2026-03-24T15:31:22Z | discovery | DB utility scripts still ran outside the new runtime boundary validator
- Status: captured
- Detail: web/scripts/db-migrate.mjs, db-check.mjs, and db-seed.mjs are execution paths that can run independently of Next runtime startup, so they need their own APP_ENV/database boundary checks to fully close the local-to-staging and staging-to-prod leak paths.


### 2026-03-24T15:35:01Z | change | Applied environment-boundary hardening across runtime, utility scripts, CI, and staging deploy rails
- Status: captured
- Detail: web/lib/env/server.ts now enforces APP_ENV identity, environment-specific public origins, Clerk key family rules, and rejects PHASE5_TEST_AUTH outside local/CI.
- Detail: web/lib/db/config.ts plus db-migrate.mjs, db-check.mjs, and db-seed.mjs now bind DB host/database-name expectations to APP_ENV so local/CI stay on local-only DB hosts while staging/prod reject local DB hosts and require their own database names.
- Detail: .github/workflows/pr.yml and deploy-staging.yml now run web/scripts/check-env-boundaries.mjs; deploy-staging.yml also validates APP_ENV=staging, /app/staging, staging HTTPS origins, and non-local app_staging DB URLs before build/push or remote deploy.
- Detail: infra/scripts/deploy_remote.sh and rollback_remote.sh now enforce staging-only origin/path/DB boundary checks on the transferred runtime env before service replacement.
- Detail: Added docs/rebuild/environment-boundary-guardrails.md plus sanitized staging runtime example placeholders so the boundary policy is documented and tracked in repo-owned examples instead of implied.


### 2026-03-24T15:35:01Z | verify | Verified environment-boundary hardening with targeted audit, typecheck, and source lint
- Status: captured
- Detail: node web/scripts/check-env-boundaries.mjs passed.
- Detail: npx tsc --noEmit passed in web after the runtime and script boundary changes.
- Detail: Targeted eslint for the edited runtime and script files passed.
- Detail: git diff --check reported only existing CRLF conversion warnings and no whitespace errors.
- Detail: A full npm run lint is not currently a useful repo-wide signal because ESLint traverses checked-in/generated .next-phase7 output and reports thousands of unrelated generated-file violations.
- Detail: npm run build compiled the app but the local Windows host failed at the later Next build spawn step with EPERM, so build verification here is limited to compile progress plus direct tsc success rather than a clean end-to-end Next build exit.


### 2026-03-24T15:35:01Z | risk | Production separation remains a documented-but-unimplemented repo rail
- Status: captured
- Detail: The repo still lacks a production compose file and production deploy workflow, so staging-to-production isolation is not yet enforced by executable repository code.
- Detail: GitHub environment secret uniqueness across staging vs prod and live Traefik router state remain external/operator concerns that this repo can validate only indirectly.


### 2026-03-24T15:41:55Z | discovery | Confirmed CI audit crash source for environment boundary audit.
- Status: captured
- Detail: web/.env.example is ignored by web/.gitignore and therefore absent on GitHub Actions runners.
- Detail: The audit script expects web/.env.example to exist and crashes with ENOENT instead of reporting a boundary failure.


### 2026-03-24T15:42:16Z | decision | Selected remediation for CI environment-boundary audit crash.
- Status: captured
- Detail: Update web/.gitignore to stop ignoring web/.env.example so GitHub Actions receives the required example file.
- Detail: Harden web/scripts/check-env-boundaries.mjs so missing required files surface as audit failures with explicit messages instead of uncaught ENOENT crashes.


### 2026-03-24T15:42:47Z | change | Patched environment boundary audit file tracking and missing-file handling.
- Status: captured
- Detail: Added !.env.example to web/.gitignore so web/.env.example can be committed and reach CI runners.
- Detail: Updated web/scripts/check-env-boundaries.mjs to convert missing required files into explicit audit failures instead of uncaught ENOENT crashes.


### 2026-03-24T15:43:08Z | verify | Verified environment boundary audit remediation locally.
- Status: captured
- Detail: node web/scripts/check-env-boundaries.mjs passed after the patch.
- Detail: git no longer ignores web/.env.example; the file now appears as untracked and must be committed for GitHub Actions to receive it.


### 2026-03-24T15:43:14Z | manual-action | Next repo action required to complete the CI fix.
- Status: captured
- Detail: Include web/.env.example in the next commit now that web/.gitignore no longer excludes it. Without that file in git, GitHub Actions will still not have the local environment example available to audit.


### 2026-03-24T15:45:03Z | request | Investigating staging deploy validation failure for STAGING_DEPLOY_PATH.
- Status: captured
- Detail: Reviewing workflow, compose examples, and deploy scripts to determine whether /app/staging is the correct enforced path or whether the validation should be aligned to existing infrastructure conventions.


### 2026-03-24T15:46:36Z | discovery | Confirmed STAGING_DEPLOY_PATH mismatch is an external GitHub vars issue, not a repo inconsistency.
- Status: captured
- Detail: deploy-staging.yml, deploy_remote.sh, rollback_remote.sh, staging compose assets, and rebuild docs all pin the staging rail to /app/staging.
- Detail: Because the workflow reads vars.STAGING_DEPLOY_PATH, the offending value may be coming from the staging environment, repository variables, or organization variables.


### 2026-03-24T15:46:57Z | change | Improved staging deploy path validation diagnostics in deploy-staging workflow.
- Status: captured
- Detail: Added absolute-path and canonical-path validation for STAGING_DEPLOY_PATH in the workflow guardrail step.
- Detail: Mismatch errors now report the resolved path value so the operator can identify the wrong GitHub variable source more quickly.


### 2026-03-24T15:47:14Z | verify | Verified updated staging deploy path diagnostics in workflow.
- Status: captured
- Detail: Corrected missing posixpath import in the inline Python validator.
- Detail: git diff --check reports only existing line-ending warnings for deploy-staging.yml; no whitespace errors were introduced.


### 2026-03-24T15:47:24Z | manual-action | Operator follow-up for STAGING_DEPLOY_PATH mismatch.
- Status: captured
- Detail: Check GitHub Variables at the staging environment, repository, and organization scopes for STAGING_DEPLOY_PATH. The workflow received a non-empty value that is not /app/staging.
- Detail: Set STAGING_DEPLOY_PATH to /app/staging exactly, with no quotes, no trailing slash, and no alternate staging root unless the repo scripts/docs are deliberately updated together.


### 2026-03-24T15:54:24Z | request | Investigating staging deploy failure due to app-staging-web container name conflict.
- Status: captured
- Detail: Reviewing staging compose configuration and remote deploy script behavior to determine whether the conflict is caused by fixed container_name usage, compose project drift, or stale remote state between deploy attempts.


### 2026-03-24T15:55:27Z | decision | Selected remediation for staging container-name conflict.
- Status: captured
- Detail: Remove fixed container_name from infra/compose/staging/compose.yml so compose can manage the service container under the project lifecycle instead of a global Docker name.
- Detail: Add a legacy-container cleanup step to deploy_remote.sh and rollback_remote.sh to remove an existing app-staging-web container before compose up, preventing conflicts and avoiding duplicate Traefik-labeled containers during the transition.


### 2026-03-24T15:56:25Z | change | Removed fixed staging container name and added legacy-container cleanup to deploy rails.
- Status: captured
- Detail: Deleted container_name from infra/compose/staging/compose.yml so Docker Compose can manage the web service container under the project lifecycle.
- Detail: deploy_remote.sh and rollback_remote.sh now remove a legacy app-staging-web container immediately before compose up and use --remove-orphans to keep the project state clean during transition.


### 2026-03-24T15:56:39Z | verify | Verified staging container-name conflict remediation locally.
- Status: captured
- Detail: git diff --check on the edited staging compose and deploy/rollback scripts reported only existing CRLF line-ending warnings.
- Detail: Direct repo inspection confirms the fixed container_name is removed and the deploy/rollback scripts now remove a legacy app-staging-web container before compose up.
- Detail: bash -n could not run on this Windows host because invoking bash returned Access is denied, so shell syntax was not verified with bash locally.


### 2026-03-24T16:01:52Z | request | Investigating staging deploy failure due to self-signed TLS certificate during ingress probe.
- Status: captured
- Detail: Reviewing staging compose labels, Traefik configuration references, and deploy probe behavior to determine whether the failure is a valid TLS guardrail or an overly strict probe during certificate bootstrap.


### 2026-03-24T16:02:33Z | discovery | Identified likely repo-side cause of self-signed TLS on staging app route.
- Status: captured
- Detail: infra/compose/staging/compose.yml enables TLS on the app router but does not set traefik.http.routers.app-staging-web.tls.certresolver.
- Detail: The documented Traefik stack in phase 3 uses the ACME resolver name le for TLS issuance, so the app router can fall back to the Traefik default self-signed certificate without the matching router label.


### 2026-03-24T16:02:46Z | change | Added explicit Traefik ACME certresolver to the staging app router.
- Status: captured
- Detail: infra/compose/staging/compose.yml now sets traefik.http.routers.app-staging-web.tls.certresolver=le, matching the documented staging Traefik resolver name from phase 3.
- Detail: The deploy ingress probe remains certificate-validating by design so staging will still fail if the live Traefik stack is missing ACME capability or cannot issue the certificate.


### 2026-03-24T16:02:54Z | verify | Verified staging app-router TLS label update locally.
- Status: captured
- Detail: infra/compose/staging/compose.yml now includes traefik.http.routers.app-staging-web.tls.certresolver=le.
- Detail: git diff --check reported only existing CRLF line-ending warnings; no whitespace errors were introduced.


### 2026-03-24T16:05:20Z | decision | TLS policy note for future phase builds.
- Status: captured
- Detail: Local development and staging may use self-signed certificates during rebuild and pre-production phases.
- Detail: Production must use a formally issued trusted SSL/TLS certificate, or an approved project/build equivalent that provides the same trust and validation guarantees, before go-live.

