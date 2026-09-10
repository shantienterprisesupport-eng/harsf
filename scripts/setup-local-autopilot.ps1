$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Ask-YesNo([string]$Question, [bool]$DefaultYes = $true) {
  $suffix = if ($DefaultYes) { "[Y/n]" } else { "[y/N]" }
  $answer = Read-Host "$Question $suffix"
  if ([string]::IsNullOrWhiteSpace($answer)) { return $DefaultYes }
  return $answer.Trim().ToLowerInvariant().StartsWith("y")
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Find-Executable([string]$CommandName, [string]$FallbackPath) {
  $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  if (Test-Path $FallbackPath) { return $FallbackPath }
  return $null
}

Write-Host ""
Write-Host "=== HARSF Local Autopilot Setup ==="
Write-Host "Workspace: $repoRoot"
Write-Host "Safety: workspace-only writes + approval on request"
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Warning "Git is not currently available in PATH. HARSF can still run, but Git is recommended for review and rollback."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Warning "Node.js is not installed. START-HARSF.cmd will need Node.js LTS before the web app can run."
}

# 1) Ollama: local, no API billing required.
$ollamaFallback = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
$ollamaExe = Find-Executable "ollama" $ollamaFallback

if (-not $ollamaExe) {
  if (Ask-YesNo "Install Ollama from the official ollama.com installer now?") {
    Write-Host "Installing Ollama from ollama.com..."
    Invoke-Expression (Invoke-RestMethod "https://ollama.com/install.ps1")
    Refresh-Path
    $ollamaExe = Find-Executable "ollama" $ollamaFallback
  }
}

if ($ollamaExe) {
  Write-Host "Ollama found: $ollamaExe"
  $modelName = "qwen2.5-coder:3b"
  $hasModel = (& $ollamaExe list 2>$null | Select-String -SimpleMatch $modelName)
  if (-not $hasModel -and (Ask-YesNo "Download the free local coding model $modelName (about 2 GB)?")) {
    & $ollamaExe pull $modelName
  }
} else {
  Write-Warning "Ollama is not installed yet. You can rerun this setup later."
}

# 2) Open Interpreter: terminal agent with sandbox and approvals.
$interpreterFallback = Join-Path $env:LOCALAPPDATA "Programs\Open Interpreter\bin\interpreter.exe"
$interpreterExe = Find-Executable "interpreter" $interpreterFallback

if (-not $interpreterExe) {
  if (Ask-YesNo "Install Open Interpreter from the official openinterpreter.com installer now?") {
    Write-Host "Installing Open Interpreter from openinterpreter.com..."
    Invoke-Expression (Invoke-RestMethod "https://www.openinterpreter.com/install.ps1")
    Refresh-Path
    $interpreterExe = Find-Executable "interpreter" $interpreterFallback
  }
}

if ($interpreterExe) {
  Write-Host "Open Interpreter found: $interpreterExe"
  & $interpreterExe --version
} else {
  Write-Warning "Open Interpreter is not installed yet. You can rerun this setup later."
}

# 3) Existing n8n stays optional because this repo uses Docker Desktop for it.
if (Get-Command docker -ErrorAction SilentlyContinue) {
  try {
    docker info | Out-Null
    Write-Host "Docker is running. n8n can be started with: npm run n8n:start"
  } catch {
    Write-Host "Docker is installed but not running. n8n will stay off until Docker Desktop is started."
  }
} else {
  Write-Host "Docker is not installed. That is OK for the local coding assistant; n8n automation can be added later."
}

Write-Host ""
Write-Host "Setup check complete."
Write-Host "Next time, double-click START-AUTOPILOT.cmd in the HARSF folder."
Write-Host "Important: never use --yolo or dangerously-bypass flags on this project."
Write-Host ""
