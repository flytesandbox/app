# Rebuild Log

## Purpose

This directory holds the operator-facing rebuild journey log for phase, staging, deployment, and recovery work.

It exists to capture:

- repo-side findings
- server-side findings
- user-reported errors
- questions and decisions
- code and doc changes
- validation results
- manual follow-up actions

This logging path is intentionally isolated from app runtime and deployment infra.

## Canonical Files

- `current.md` is the active append-only journey log
- `tools/append-entry.ps1` appends timestamped entries without touching app code or infra rails

## Logging Rules

- log before or after every meaningful rebuild action
- redact secrets, passwords, private keys, full DB URLs, fingerprints, and private IPs
- record the file or system area involved when possible
- keep entries factual and short enough to scan later

## Append Command

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\rebuild-log\tools\append-entry.ps1 `
  -Type discovery `
  -Summary "Phase 7 deploy reached remote host but failed in DB migration" `
  -Details "Remote deploy script still forced migrations even though DATABASE_ENABLED=false is a valid rails-first mode."
```

## Session Handling

- keep appending to `current.md` while the same recovery stream is active
- when a stream is fully closed, copy or rename `current.md` into a dated archive file and start a fresh `current.md`
