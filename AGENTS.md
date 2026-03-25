# Agent Workflow

## Support Evidence

For staging, deployment, infrastructure, recovery, support, or ecosystem
maintenance work:

- append entries to `docs/support/evidence/current.md`
- use `docs/support/evidence/tools/append-entry.ps1` when shell access is available
- log the request, each material finding, each repo change, each validation result, each blocker, and each manual action handed to the user

Minimum logging cadence for non-trivial work:

- once at the start of investigation
- once after each major discovery or decision
- once before or after each file edit batch
- once after verification

Redaction rules:

- never log secrets, passwords, tokens, private keys, full private DB URLs, raw host fingerprints, or private IPs
- describe sensitive values by name and role only

Isolation rule:

- keep support evidence under `docs/support/evidence/`
- do not wire support-evidence tooling into app runtime, package scripts, CI deploy behavior, or compose files

If the user explicitly tells you not to log a task, follow the user instruction for that task.
