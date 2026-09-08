@echo off
setlocal
cd /d "%~dp0"

echo HARSF n8n Safe Handoff
echo Planning/read-only goals only. Protected actions will be BLOCKED.
echo.

set /p HARSF_GOAL=Human CEO goal: 
if "%HARSF_GOAL%"=="" (
  echo BLOCKED: A goal is required.
  pause
  exit /b 1
)

node scripts\n8n-safe-handoff.mjs "%HARSF_GOAL%"
set EXITCODE=%ERRORLEVEL%

echo.
if not "%EXITCODE%"=="0" (
  echo NEXT: Run npm run n8n:status and review any BLOCKED reason above.
)
pause
exit /b %EXITCODE%
