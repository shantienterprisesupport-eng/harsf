$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host ""
Write-Host "=== HARSF MASTER AI AGENT ==="
Write-Host ""

$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  Write-Host "Preparing agent environment for first use..."
  & (Join-Path $PSScriptRoot "setup-agents.ps1")
}

if (-not (Test-Path $venvPython)) {
  throw "PraisonAI environment could not be prepared."
}

$envFile = Join-Path $repoRoot ".env.local"
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line) -or $line -notmatch '=') { continue }
    $parts = $line -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, 'Process')) {
      [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
  }
}

$provider = "none"
if ($env:AI_PROVIDER -in @('anthropic', 'claude')) {
  $provider = "Claude"
} elseif ($env:AI_PROVIDER -eq 'openai') {
  $provider = "OpenAI"
} elseif ($env:ANTHROPIC_API_KEY) {
  $provider = "Claude"
} elseif ($env:OPENAI_API_KEY) {
  $provider = "OpenAI"
}

if ($provider -eq "none") {
  Write-Host "BLOCKED: No AI provider key found in .env.local." -ForegroundColor Yellow
  exit 2
}

Write-Host ("Provider: " + $provider)
Write-Host "Protected actions still require your approval."
Write-Host "You can type a goal, or use Windows voice typing (Win+H) in the goal box."
Write-Host "Type EXIT to close."
Write-Host ""

while ($true) {
  $goal = Read-Host "Human CEO goal"
  if ([string]::IsNullOrWhiteSpace($goal)) { continue }
  if ($goal.Trim().ToUpperInvariant() -eq "EXIT") { break }

  Write-Host ""
  & $venvPython (Join-Path $repoRoot "praison\ai_company.py") --goal $goal
  $code = $LASTEXITCODE
  Write-Host ""

  if ($code -ne 0) {
    Write-Host ("Master AI returned error code " + $code + ".") -ForegroundColor Yellow
  }
}
