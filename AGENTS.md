# Agent Workflow

## Rebuild Logging

For rebuild, phase, staging, deployment, infrastructure, or recovery work:

- append entries to `docs/rebuild-log/current.md`
- use `docs/rebuild-log/tools/append-entry.ps1` when shell access is available
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

- keep rebuild logging under `docs/rebuild-log/`
- do not wire rebuild-log tooling into app runtime, package scripts, CI deploy behavior, or compose files

If the user explicitly tells you not to log a task, follow the user instruction for that task.
