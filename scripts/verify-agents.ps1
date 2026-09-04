$ErrorActionPreference = "Continue"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "=== HARSF Agent Verification ==="
Write-Host "Node:" (node --version)
Write-Host "npm:" (npm --version)

if (Test-Path ".venv\Scripts\python.exe") {
  $venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
  & $venvPython --version
  & $venvPython -c "import praisonaiagents; print('PraisonAI import: OK')"
} else {
  Write-Warning ".venv not found. Run npm run agents:setup after the laptop is on."
}

Write-Host "Ruflo version:"
npx --yes ruflo@latest --version

Write-Host "Ruflo doctor:"
npx --yes ruflo@latest doctor
