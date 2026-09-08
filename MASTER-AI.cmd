@echo off
setlocal
title HARSF Master AI Agent
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-master-ai.ps1"

if errorlevel 1 (
  echo.
  echo HARSF Master AI stopped with an error.
  pause
)

endlocal
