$ErrorActionPreference = 'SilentlyContinue'
Set-Location (Split-Path -Parent $PSScriptRoot)

$done = New-Object System.Collections.Generic.List[string]
$blocked = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$next = New-Object System.Collections.Generic.List[string]

function Done([string]$message) { $done.Add($message) }
function Blocked([string]$message, [string]$nextStep = '') {
  $blocked.Add($message)
  if ($nextStep) { $next.Add($nextStep) }
}
function Warning([string]$message, [string]$nextStep = '') {
  $warnings.Add($message)
  if ($nextStep) { $next.Add($nextStep) }
}
function Get-EnvValue([string]$name, [string[]]$lines) {
  $line = $lines | Where-Object { $_ -match "^$name=.*" } | Select-Object -First 1
  if ($null -eq $line) { return '' }
  return (($line -replace "^$name=", '').Trim())
}

Write-Host "HARSF DOCTOR" -ForegroundColor Cyan
Write-Host "Read-only diagnostics: no secrets, installs, starts, merges, deploys, or writes are performed." -ForegroundColor DarkGray
Write-Host ""

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $nodeVersion = (& node --version 2>$null).Trim()
  $major = 0
  if ($nodeVersion -match '^v(\d+)') { $major = [int]$Matches[1] }
  if ($major -ge 20) { Done "Node.js $nodeVersion" }
  else { Blocked "Node.js $nodeVersion is too old for the current Ruflo setup" "Install Node.js 20+ and run npm run doctor again." }
} else {
  Blocked "Node.js not found" "Install Node.js 20+ and run npm run doctor again."
}

if (Get-Command npm -ErrorAction SilentlyContinue) { Done "npm available" }
else { Blocked "npm not found" "Install Node.js/npm." }

$envFile = Join-Path (Get-Location) '.env.local'
$directProviderKeys = @('ANTHROPIC_API_KEY','OPENAI_API_KEY','DEEPSEEK_API_KEY','XAI_API_KEY')
$configuredProviders = New-Object System.Collections.Generic.List[string]
if (Test-Path $envFile) {
  Done ".env.local exists"
  $lines = Get-Content $envFile

  $aiProvider = Get-EnvValue 'AI_PROVIDER' $lines
  if (-not $aiProvider) { $aiProvider = 'auto' }
  else { $aiProvider = $aiProvider.ToLowerInvariant() }

  foreach ($key in $directProviderKeys) {
    $value = Get-EnvValue $key $lines
    if ($value) { $configuredProviders.Add($key.Replace('_API_KEY','')) }
  }

  $omniKey = Get-EnvValue 'OMNIROUTE_API_KEY' $lines
  $omniModel = Get-EnvValue 'OMNIROUTE_MODEL' $lines
  $omniConfigured = [bool]($omniKey -and $omniModel)

  if ($omniConfigured) {
    Done "OmniRoute smart router configured (key hidden / route: $omniModel)"
  } elseif (($aiProvider -eq 'omniroute') -or ($aiProvider -eq 'omni') -or $omniKey -or $omniModel) {
    Warning "OmniRoute configuration is incomplete" "Set both OMNIROUTE_API_KEY and OMNIROUTE_MODEL in .env.local when you want OmniRoute."
  }

  if ($configuredProviders.Count -gt 0) {
    Done ("Direct AI provider credential present for: " + ($configuredProviders -join ', ') + " (value hidden)")
  }
  if (($configuredProviders.Count -eq 0) -and (-not $omniConfigured)) {
    Warning "No external live AI route/provider is configured in .env.local" "Optional: configure OmniRoute or an authorized direct provider later. Local Master AI can continue independently."
  }
} else {
  Blocked ".env.local not found" "Copy .env.example to .env.local."
}

try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8787/health' -Method Get -TimeoutSec 2
  if ($health.ok) {
    $modelText = if ($health.model) { " / $($health.model)" } else { '' }
    Done "AI gateway reachable: $($health.provider)$modelText"
  } else { Warning "AI gateway health response is not healthy" "Run npm run ai:gateway only when you want HARSF live AI chat." }
} catch {
  Warning "AI gateway is not currently reachable on 127.0.0.1:8787" "Run npm run ai:gateway only when you want HARSF live AI chat."
}

$python = Join-Path (Get-Location) '.venv\Scripts\python.exe'
if (Test-Path $python) {
  & $python -c "import praisonai" 2>$null
  if ($LASTEXITCODE -eq 0) { Done "PraisonAI import works in .venv" }
  else { Blocked "PraisonAI is not importable from .venv" "Run npm run agents:setup." }
} else {
  Blocked ".venv is missing" "Run npm run agents:setup to create the PraisonAI environment."
}

if (Test-Path 'praison\ai_company.py') { Done "Six-agent PraisonAI entrypoint exists" }
else { Blocked "praison\ai_company.py is missing" "Restore the six-agent PraisonAI entrypoint from GitHub." }

if (Get-Command npx -ErrorAction SilentlyContinue) {
  $rufloVersion = (& npx --no-install ruflo --version 2>$null | Select-Object -First 1)
  if ($LASTEXITCODE -eq 0 -and $rufloVersion) { Done "Ruflo available locally: $rufloVersion" }
  else { Warning "Ruflo is not available locally without downloading" "Optional for the current local MVP: run npm run agents:setup when network access is allowed." }
} else {
  Warning "npx not found, so Ruflo cannot be checked" "Install Node.js/npm before enabling Ruflo."
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  & docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    Done "Docker engine is running"
    if (Test-Path 'n8n\docker-compose.yml') {
      $running = (& docker compose -f 'n8n\docker-compose.yml' ps --status running --services 2>$null)
      if ($LASTEXITCODE -eq 0 -and $running) { Done ("n8n Docker services running: " + (($running | Where-Object { $_ }) -join ', ')) }
      else { Warning "n8n Docker services are not currently running" "Run npm run n8n:start only when you want to start n8n." }
    } else { Warning "n8n/docker-compose.yml is missing" "Restore the n8n runtime files before using n8n." }
  } else {
    Warning "Docker command exists but the engine is not running" "Start Docker Desktop only when you want to use n8n."
  }
} else {
  Warning "Docker not found" "Install/start Docker only if you want the local n8n runtime."
}

if (Test-Path 'n8n\workflows\harsf-agent-intake.json') { Done "Six-agent n8n intake workflow file exists" }
else { Warning "Six-agent n8n intake workflow file is missing" "Restore/import the workflow before n8n execution."
}

Write-Host ""
Write-Host "DONE ($($done.Count))" -ForegroundColor Green
foreach ($item in $done) { Write-Host "  + $item" }

Write-Host ""
Write-Host "BLOCKED ($($blocked.Count))" -ForegroundColor Yellow
if ($blocked.Count -eq 0) { Write-Host "  + Nothing core-blocking" }
else { foreach ($item in $blocked) { Write-Host "  - $item" } }

Write-Host ""
Write-Host "WARNINGS ($($warnings.Count))" -ForegroundColor DarkYellow
if ($warnings.Count -eq 0) { Write-Host "  + No optional warnings" }
else { foreach ($item in $warnings) { Write-Host "  ! $item" } }

Write-Host ""
Write-Host "NEXT" -ForegroundColor Cyan
if ($next.Count -eq 0) { Write-Host "  + HARSF local prerequisites look ready." }
else {
  $seen = @{}
  foreach ($item in $next) {
    if (-not $seen.ContainsKey($item)) { Write-Host "  > $item"; $seen[$item] = $true }
  }
}

if ($blocked.Count -gt 0) { exit 1 }
exit 0
