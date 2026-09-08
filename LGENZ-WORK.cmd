@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo        L GenZ Work - Local App
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js / npm is not installed or not in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing app dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo Starting L GenZ Work...
start "L GenZ Work Server" cmd /k "cd /d "%~dp0" && npm run dev -- --host 127.0.0.1"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173/?app=lgenz-work"

endlocal
