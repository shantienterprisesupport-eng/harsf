$ErrorActionPreference = "Continue"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "=== HARSF Agent Verification ==="

if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Host "Node:" (node --version)
} else {
  Write-Error "Node.js not found"
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
  Write-Host "npm:" (npm --version)
} else {
  Write-Error "npm not found"
}

if (Test-Path ".venv\Scripts\python.exe") {
  $venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
  & $venvPython --version
  & $venvPython -c "import praisonaiagents; print('PraisonAI import: OK')"
  & $venvPython -m py_compile "praison\ai_company.py"
  if ($LASTEXITCODE -eq 0) { Write-Host "Six-agent Python file: syntax OK" }
} else {
  Write-Warning ".venv not found. Run npm run agents:setup after the laptop is on."
}

$agentText = Get-Content "praison\ai_company.py" -Raw
$roles = @(
  "Master Orchestrator Agent",
  "n8n Workflow Agent",
  "Coding and GitHub Agent",
  "Bug Fix and QA Agent",
  "Security Agent",
  "Deploy and Ops Agent"
)
$missingRoles = @($roles | Where-Object { $agentText -notmatch [regex]::Escape($_) })
if ($missingRoles.Count -eq 0) {
  Write-Host "Agent roles: 6/6 present"
} else {
  Write-Error ("Missing agent roles: " + ($missingRoles -join ", "))
}

Write-Host "Ruflo version:"
npx --yes ruflo@latest --version
Write-Host "Ruflo doctor:"
npx --yes ruflo@latest doctor

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "n8n Docker Compose config check:"
  docker compose -f "n8n\docker-compose.yml" config | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "n8n compose: OK" }
} else {
  Write-Warning "Docker not found; n8n runtime check skipped."
}
