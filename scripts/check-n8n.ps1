$ErrorActionPreference = "SilentlyContinue"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$n8nDir = Join-Path $repoRoot "n8n"
Set-Location $n8nDir

$done = New-Object System.Collections.Generic.List[string]
$blocked = New-Object System.Collections.Generic.List[string]
$next = New-Object System.Collections.Generic.List[string]

function Done([string]$message) { $done.Add($message) }
function Blocked([string]$message, [string]$nextStep = '') {
  $blocked.Add($message)
  if ($nextStep) { $next.Add($nextStep) }
}

Write-Host "HARSF n8n STATUS" -ForegroundColor Cyan
Write-Host "Safe diagnostics only: no logs, secrets, credentials, imports, activation, or workflow execution." -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Blocked "Docker is not installed" "Install Docker Desktop before using the local n8n runtime."
} else {
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    Blocked "Docker Desktop is not running" "Start Docker Desktop, then run npm run n8n:status again."
  } else {
    Done "Docker engine is running"

    $running = (& docker compose -f 'docker-compose.yml' ps --status running --services 2>$null)
    if ($LASTEXITCODE -eq 0 -and ($running -contains 'n8n')) {
      Done "n8n container is running"
    } else {
      Blocked "n8n container is not running" "Run npm run n8n:start."
    }
  }
}

if (Test-Path 'workflows\harsf-agent-intake.json') {
  try {
    $workflow = Get-Content 'workflows\harsf-agent-intake.json' -Raw | ConvertFrom-Json
    Done "HARSF six-agent workflow JSON is readable"
    if ($workflow.active -eq $false) {
      Done "Repository workflow is safely inactive by default"
    } else {
      Blocked "Repository workflow must remain inactive by default" "Set active=false in the repository workflow before import."
    }
  } catch {
    Blocked "HARSF workflow JSON is invalid" "Restore or fix n8n/workflows/harsf-agent-intake.json."
  }
} else {
  Blocked "HARSF six-agent workflow file is missing" "Restore n8n/workflows/harsf-agent-intake.json from GitHub."
}

try {
  $health = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/healthz' -UseBasicParsing -TimeoutSec 4
  if ($health.StatusCode -eq 200) {
    Done "n8n /healthz is reachable"
  } else {
    Blocked "n8n health endpoint returned HTTP $($health.StatusCode)" "Run npm run n8n:start and retry."
  }
} catch {
  Blocked "n8n /healthz is not reachable" "Run npm run n8n:start, then retry."
}

Write-Host ""
Write-Host "DONE ($($done.Count))" -ForegroundColor Green
foreach ($item in $done) { Write-Host "  + $item" }

Write-Host ""
Write-Host "BLOCKED ($($blocked.Count))" -ForegroundColor Yellow
if ($blocked.Count -eq 0) { Write-Host "  + Nothing blocked" }
else { foreach ($item in $blocked) { Write-Host "  - $item" } }

Write-Host ""
Write-Host "NEXT" -ForegroundColor Cyan
if ($next.Count -eq 0) {
  Write-Host "  + Local n8n runtime looks healthy."
  Write-Host "  > Use npm run n8n:import only when you explicitly want to import the reviewed workflow."
  Write-Host "  > Activation remains manual in n8n."
} else {
  $seen = @{}
  foreach ($item in $next) {
    if (-not $seen.ContainsKey($item)) { Write-Host "  > $item"; $seen[$item] = $true }
  }
}

if ($blocked.Count -gt 0) { exit 1 }
exit 0
