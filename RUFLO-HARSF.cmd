@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo BLOCKED: Node.js is not available.
  echo NEXT: Install Node.js 20+ and run this launcher again.
  pause
  exit /b 1
)

node ".\scripts\ruflo-orchestrate.mjs"
set EXITCODE=%ERRORLEVEL%
echo.
if "%EXITCODE%"=="0" (
  echo Ruflo coordination finished.
  echo PraisonAI was NOT started automatically.
  echo Run: npm run agents:run:handoff
  echo only when you want the configured model/provider to be used.
) else (
  echo Ruflo coordination is BLOCKED. Read the DONE / BLOCKED / NEXT output above.
)
pause
exit /b %EXITCODE%
