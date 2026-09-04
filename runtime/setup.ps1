$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ''
Write-Host 'HARSF FREE LOCAL MODEL SETUP' -ForegroundColor Cyan
Write-Host 'Default provider: Ollama local (no paid API balance required)'
Write-Host 'Model: qwen2.5-coder:0.5b'
Write-Host ''

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  Write-Host 'Ollama is not installed on this Windows laptop yet.' -ForegroundColor Yellow
  Write-Host 'Install Ollama for Windows from the official Ollama download page, then run SETUP-HARSF.cmd again.' -ForegroundColor Yellow
  Write-Host 'Your existing .env has NOT been changed.' -ForegroundColor Green
  exit 2
}

$model = 'qwen2.5-coder:0.5b'
Write-Host "Preparing free local coding model: $model" -ForegroundColor Cyan
& ollama pull $model
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Model download failed. Existing .env was left unchanged.' -ForegroundColor Red
  exit 1
}

$runtimeDir = '.harsf-runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
if (Test-Path '.env') {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item '.env' (Join-Path $runtimeDir "env-backup-$stamp.txt") -Force
  Write-Host 'Previous local model config backed up inside .harsf-runtime.' -ForegroundColor DarkGray
}

$envContent = @"
VITE_API_BASE_URL=http://localhost:8787
HARSF_MODEL_API_URL=http://127.0.0.1:11434/v1/chat/completions
HARSF_MODEL_API_KEY=ollama
HARSF_MODEL_NAME=$model
"@

Set-Content -Path '.env' -Value $envContent -Encoding UTF8
Write-Host ''
Write-Host 'FREE local model connection saved.' -ForegroundColor Green
Write-Host 'No DeepSeek balance or cloud API key is required for this local mode.' -ForegroundColor Green
Write-Host 'Next: double-click START-HARSF.cmd to run UI + API + worker.' -ForegroundColor Green
