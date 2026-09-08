$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  & (Join-Path $PSScriptRoot "setup.ps1")
}
if (-not (Test-Path $venvPython)) { throw "Master AI environment could not be prepared." }

$envFile = Join-Path $repoRoot ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Host "BLOCKED: Copy .env.example to .env.local and add your authorized API key." -ForegroundColor Yellow
  exit 2
}

foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line) -or $line -notmatch '=') { continue }
  $parts = $line -split '=', 2
  $key = $parts[0].Trim()
  $value = $parts[1].Trim()
  if ($key -and $value -and -not [Environment]::GetEnvironmentVariable($key, 'Process')) {
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

Write-Host ""
Write-Host "=== PERSONAL MASTER AI ==="
Write-Host "Protected actions require Human CEO approval."
Write-Host "Type EXIT to close."
Write-Host ""

while ($true) {
  $goal = Read-Host "Goal"
  if ([string]::IsNullOrWhiteSpace($goal)) { continue }
  if ($goal.Trim().ToUpperInvariant() -eq "EXIT") { break }
  Write-Host ""
  & $venvPython (Join-Path $repoRoot "master_ai.py") --goal $goal
  Write-Host ""
}
