param(
  [string]$LocalPath = "C:\Dev\Repos\app",
  [string]$RemoteUrl = "https://github.com/flytesandbox/app.git",
  [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

Set-Location $LocalPath

if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
}

$null = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $RemoteUrl
} else {
  git remote add origin $RemoteUrl
}

git push -u origin $Branch
