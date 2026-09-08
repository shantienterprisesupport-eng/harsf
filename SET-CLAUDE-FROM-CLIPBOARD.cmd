@echo off
setlocal
title HARSF Claude Setup
cd /d "%~dp0"

echo HARSF Claude Setup
echo -------------------
echo 1. Create/copy your Anthropic API key in the browser.
echo 2. Leave the key in your clipboard.
echo 3. This helper saves it only to .env.local on this laptop.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$key=(Get-Clipboard -Raw).Trim();" ^
  "if([string]::IsNullOrWhiteSpace($key)){ Write-Host 'Clipboard is empty. Copy the Anthropic API key first.' -ForegroundColor Red; exit 2 };" ^
  "if($key -notmatch '^sk-ant-'){ Write-Host 'Clipboard does not look like an Anthropic API key. Nothing was changed.' -ForegroundColor Red; exit 3 };" ^
  "$path=Join-Path (Get-Location) '.env.local';" ^
  "$lines=if(Test-Path $path){ @(Get-Content $path) } else { @() };" ^
  "$foundKey=$false; $foundProvider=$false; $foundModel=$false;" ^
  "$updated=@($lines | ForEach-Object {" ^
  "  if($_ -match '^ANTHROPIC_API_KEY='){ $foundKey=$true; 'ANTHROPIC_API_KEY='+$key }" ^
  "  elseif($_ -match '^AI_PROVIDER='){ $foundProvider=$true; 'AI_PROVIDER=anthropic' }" ^
  "  elseif($_ -match '^ANTHROPIC_MODEL='){ $foundModel=$true; $_ }" ^
  "  else { $_ }" ^
  "});" ^
  "if(-not $foundKey){ $updated += 'ANTHROPIC_API_KEY='+$key };" ^
  "if(-not $foundProvider){ $updated += 'AI_PROVIDER=anthropic' };" ^
  "if(-not $foundModel){ $updated += 'ANTHROPIC_MODEL=claude-sonnet-5' };" ^
  "Set-Content -Path $path -Value $updated -Encoding UTF8;" ^
  "Set-Clipboard -Value '';" ^
  "Write-Host 'Claude key saved locally and Claude set as primary provider. Clipboard cleared. Nothing was uploaded to GitHub.' -ForegroundColor Green;"

if errorlevel 1 (
  echo.
  echo Claude setup was not completed.
  pause
  exit /b 1
)

echo.
echo Claude is configured as the primary HARSF AI on this laptop.
echo Restart HARSF to use Claude for app-building tasks.
pause
endlocal
