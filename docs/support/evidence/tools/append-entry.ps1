[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("request", "discovery", "decision", "question", "change", "verify", "manual-action", "risk")]
  [string]$Type,

  [Parameter(Mandatory = $true)]
  [string]$Summary,

  [string[]]$Details = @(),

  [string]$Status = "captured",

  [string]$LogPath
)

$logRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedLogPath = if ($LogPath) { $LogPath } else { Join-Path $logRoot "current.md" }

function Ensure-LogFile {
  param([string]$Path)

  if (Test-Path $Path) {
    return
  }

  $header = @(
    "# Support Evidence Log",
    "",
    "## Scope",
    "- Started: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd'))",
    "- Status: in progress",
    "- Canonical append path: `docs/support/evidence/current.md`",
    "",
    "## Guardrails",
    "- Redact secrets, passwords, private keys, full DB URLs, host fingerprints, and private IPs.",
    "- Log repo changes, system findings, open questions, manual actions, and verification results.",
    "- Keep this log isolated from app runtime and deployment infra.",
    "",
    "## Entries",
    ""
  )

  $parent = Split-Path -Parent $Path
  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  Set-Content -Path $Path -Value $header
}

function Normalize-Detail {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  return ($Value -replace "(`r`n|`n|`r)", " ").Trim()
}

Ensure-LogFile -Path $resolvedLogPath

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$lines = @(
  "### $timestamp | $Type | $Summary",
  "- Status: $Status"
)

foreach ($detail in $Details) {
  $normalized = Normalize-Detail -Value $detail
  if ($null -ne $normalized) {
    $lines += "- Detail: $normalized"
  }
}

Add-Content -Path $resolvedLogPath -Value ("`n" + ($lines -join "`n") + "`n")

