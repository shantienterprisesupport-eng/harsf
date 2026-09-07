@echo off
setlocal
title HARSF Autopilot

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Preparing HARSF for first use...
  call npm install
  if errorlevel 1 goto :error
)

echo Starting secure AI gateway...
start "HARSF AI Gateway" /min cmd /k "cd /d ""%~dp0"" && npm run ai:gateway"

echo Starting HARSF...
echo Open the local address shown below in your browser.
call npm run dev -- --host 127.0.0.1
goto :end

:error
echo HARSF could not start. Keep this window open and share a photo of the error.
pause

:end
endlocal
