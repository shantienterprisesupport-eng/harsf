$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "HARSF agent setup starting..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node.js 20+ and run this script again."
}

$nodeVersion = (node --version).TrimStart('v')
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
  throw "Ruflo requires Node.js 20+. Current version: $nodeVersion"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required."
}

$pythonCmd = $null
$pythonPrefix = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pythonCmd = "py"
  $pythonPrefix = @("-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCmd = "python"
} else {
  throw "Python 3.10+ is required for PraisonAI."
}

Write-Host "Creating PraisonAI virtual environment..."
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  & $pythonCmd @pythonPrefix -m venv .venv
}

$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install praisonai

Write-Host "Checking PraisonAI import..."
& $venvPython -c "import praisonaiagents; print('PraisonAI OK')"

Write-Host "Initializing Ruflo in this repository..."
npx --yes ruflo@latest init

Write-Host "Checking Ruflo..."
try {
  npx --yes ruflo@latest doctor
} catch {
  Write-Warning "Ruflo doctor reported an environment/config item. The install itself may still be present; review doctor output when the laptop is online."
}

Write-Host "Setup complete. Human approval remains required for code changes, merges, deploys, secrets, migrations and destructive actions."
