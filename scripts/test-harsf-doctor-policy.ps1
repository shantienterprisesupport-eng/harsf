$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$doctorPath = Join-Path (Get-Location) 'scripts/harsf-doctor.ps1'
if (-not (Test-Path $doctorPath)) {
  throw 'scripts/harsf-doctor.ps1 is missing'
}

$text = Get-Content $doctorPath -Raw

function Assert-Contains([string]$needle, [string]$label) {
  if (-not $text.Contains($needle)) {
    throw "Doctor policy regression: missing $label"
  }
}

function Assert-NotContains([string]$needle, [string]$label) {
  if ($text.Contains($needle)) {
    throw "Doctor policy regression: $label must not be core-blocking"
  }
}

# Core local prerequisites may still block the action-capable Master AI stack.
Assert-Contains 'Blocked "Node.js not found"' 'Node.js core blocker'
Assert-Contains 'Blocked "npm not found"' 'npm core blocker'
Assert-Contains 'Blocked ".env.local not found"' '.env.local core blocker'
Assert-Contains 'Blocked ".venv is missing"' '.venv core blocker'
Assert-Contains 'Blocked "PraisonAI is not importable from .venv"' 'PraisonAI core blocker'
Assert-Contains 'Blocked "praison\\ai_company.py is missing"' 'PraisonAI entrypoint core blocker'

# Optional integrations must remain warnings so the local MVP is not falsely reported as blocked.
$optionalWarnings = @(
  'OmniRoute configuration is incomplete',
  'No external live AI route/provider is configured in .env.local',
  'AI gateway health response is not healthy',
  'AI gateway is not currently reachable on 127.0.0.1:8787',
  'Ruflo is not available locally without downloading',
  'npx not found, so Ruflo cannot be checked',
  'n8n Docker services are not currently running',
  'n8n/docker-compose.yml is missing',
  'Docker command exists but the engine is not running',
  'Docker not found',
  'Six-agent n8n intake workflow file is missing'
)

foreach ($message in $optionalWarnings) {
  Assert-Contains "Warning `"$message`"" "warning classification for '$message'"
  Assert-NotContains "Blocked `"$message`"" "'$message'"
}

# Exit status must be controlled by the core blocked list, not warning count.
Assert-Contains 'if ($blocked.Count -gt 0) { exit 1 }' 'blocked-count exit rule'
if ($text -match 'warnings\.Count\s*-gt\s*0[^\r\n]*exit\s+1') {
  throw 'Doctor policy regression: warnings must not cause exit 1'
}

Write-Host 'HARSF doctor policy regression checks passed.'
