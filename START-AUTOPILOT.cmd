@echo off
setlocal
title HARSF Local Autopilot

cd /d "%~dp0"

where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not ready yet.
  echo Run: powershell -ExecutionPolicy Bypass -File scripts\setup-local-autopilot.ps1
  pause
  exit /b 1
)

where interpreter >nul 2>nul
if errorlevel 1 (
  echo Open Interpreter is not ready yet.
  echo Run: powershell -ExecutionPolicy Bypass -File scripts\setup-local-autopilot.ps1
  pause
  exit /b 1
)

echo Starting HARSF web app in a separate window...
start "HARSF Web" cmd /c ""%~dp0START-HARSF.cmd""

where docker >nul 2>nul
if not errorlevel 1 (
  docker info >nul 2>nul
  if not errorlevel 1 (
    echo Starting local n8n in the background...
    start "HARSF n8n" /min cmd /c "cd /d ""%~dp0"" && npm run n8n:start"
  )
)

echo.
echo Starting free local AI assistant inside this HARSF folder.
echo It can edit this workspace, but escalation requires your approval.
echo.
interpreter --oss --local-provider ollama -m qwen2.5-coder:3b --sandbox workspace-write --ask-for-approval on-request --cd "%~dp0"

endlocal
