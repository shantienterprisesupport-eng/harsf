@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title HARSF AUTOPILOT

set "HARSF_BRANCH=ai/autopilot-orchestrator-v1"
set "CURRENT_BRANCH="
set "WORKTREE_DIRTY=0"

if exist ".git" (
  for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
  if /I "!CURRENT_BRANCH!"=="%HARSF_BRANCH%" (
    for /f "delims=" %%S in ('git status --porcelain 2^>nul') do set "WORKTREE_DIRTY=1"
    if "!WORKTREE_DIRTY!"=="0" (
      echo Checking for the latest safe HARSF update...
      git fetch origin %HARSF_BRANCH% >nul 2>&1
      if !ERRORLEVEL! EQU 0 (
        git merge --ff-only FETCH_HEAD >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
          echo HARSF code is up to date.
        ) else (
          echo Auto-update skipped; current code will start safely.
        )
      ) else (
        echo Internet/GitHub update check unavailable; current code will start.
      )
    ) else (
      echo Local code changes detected; auto-update skipped to protect your work.
    )
  ) else (
    echo Current branch is !CURRENT_BRANCH!; auto-update skipped.
  )
)

if not exist ".env" (
  echo HARSF local model config not found.
  echo Run SETUP-HARSF.cmd once, then start again.
  pause
  exit /b 1
)

echo Cleaning old HARSF processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0runtime\stop-stale.ps1"

echo Starting HARSF with saved local configuration...
echo Startup will automatically run the local Ollama + worker + QA self-test.
node --env-file=.env runtime\start.mjs
pause
