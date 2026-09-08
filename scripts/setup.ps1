$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$pythonCmd = $null
$pythonPrefix = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pythonCmd = "py"
  $pythonPrefix = @("-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCmd = "python"
} else {
  throw "Python 3.10+ is required."
}

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Write-Host "Creating Master AI environment..."
  & $pythonCmd @pythonPrefix -m venv .venv
}

$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt
& $venvPython -c "import praisonaiagents; print('PraisonAI OK')"
Write-Host "Master AI setup complete."
