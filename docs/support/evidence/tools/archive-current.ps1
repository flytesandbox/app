[CmdletBinding()]
param(
  [string]$CurrentLogPath,

  [string]$ArchiveDir,

  [string]$ArchiveName,

  [switch]$Force
)

$logRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedCurrentLogPath = if ($CurrentLogPath) { $CurrentLogPath } else { Join-Path $logRoot "current.md" }
$resolvedArchiveDir = if ($ArchiveDir) { $ArchiveDir } else { Join-Path $logRoot "archive" }
$resolvedArchiveName = if ($ArchiveName) {
  $ArchiveName
} else {
  "current-$((Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')).md"
}
$resolvedArchivePath = Join-Path $resolvedArchiveDir $resolvedArchiveName

function New-CurrentLogHeader {
  return @(
    '# Support Evidence Log',
    '',
    '## Scope',
    "- Started: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd'))",
    '- Status: in progress',
    '- Canonical append path: docs/support/evidence/current.md',
    '',
    '## Guardrails',
    '- Redact secrets, passwords, private keys, full DB URLs, host fingerprints, and private IPs.',
    '- Log repo changes, system findings, open questions, manual actions, and verification results.',
    '- Keep this log isolated from app runtime and deployment infra.',
    '',
    '## Entries',
    ''
  )
}

if (-not (Test-Path $resolvedCurrentLogPath)) {
  throw "Current evidence log not found: $resolvedCurrentLogPath"
}

New-Item -ItemType Directory -Force -Path $resolvedArchiveDir | Out-Null

if ((Test-Path $resolvedArchivePath) -and -not $Force) {
  throw "Archive path already exists: $resolvedArchivePath"
}

Move-Item -LiteralPath $resolvedCurrentLogPath -Destination $resolvedArchivePath -Force:$Force
Set-Content -Path $resolvedCurrentLogPath -Value (New-CurrentLogHeader)

Write-Output "Archived support evidence log to $resolvedArchivePath"
Write-Output "Created fresh current log at $resolvedCurrentLogPath"

