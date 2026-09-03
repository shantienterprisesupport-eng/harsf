$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ''
Write-Host 'HARSF FIRST-TIME MODEL SETUP' -ForegroundColor Cyan
Write-Host 'Default provider: DeepSeek V4 Flash'
Write-Host 'Your API key will be saved only in the local .env file, which Git ignores.'
Write-Host ''

$secureKey = Read-Host 'Paste your DeepSeek API key' -AsSecureString
$credential = New-Object System.Management.Automation.PSCredential('harsf', $secureKey)
$key = $credential.GetNetworkCredential().Password
if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Host 'No key entered. Setup cancelled.' -ForegroundColor Yellow
  exit 1
}
if ($key -match "[`r`n]") {
  Write-Host 'Invalid key format.' -ForegroundColor Red
  exit 1
}

$envContent = @"
VITE_API_BASE_URL=http://localhost:8787
HARSF_MODEL_API_URL=https://api.deepseek.com/chat/completions
HARSF_MODEL_API_KEY=$key
HARSF_MODEL_NAME=deepseek-v4-flash
"@

Set-Content -Path '.env' -Value $envContent -Encoding UTF8
Write-Host ''
Write-Host 'Model connection saved locally.' -ForegroundColor Green
Write-Host 'Next time, double-click START-HARSF.cmd to run UI + API + worker.' -ForegroundColor Green
Write-Host 'Do not upload or commit the .env file.' -ForegroundColor Yellow
