@echo off
cd /d %~dp0
title HARSF AUTOPILOT

if not exist ".env" (
  echo HARSF local model config not found.
  echo Run SETUP-HARSF.cmd once, then start again.
  pause
  exit /b 1
)

echo Cleaning old HARSF processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0runtime\stop-stale.ps1"

echo Starting HARSF with saved local configuration...
node --env-file=.env runtime\start.mjs
pause
