@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\harsf-doctor.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo HARSF Doctor found one or more BLOCKED items above.
) else (
  echo HARSF Doctor completed with no blocked checks.
)
pause
exit /b %EXITCODE%
