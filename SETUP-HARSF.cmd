@echo off
cd /d %~dp0
title HARSF FIRST-TIME SETUP
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0runtime\setup.ps1"
pause
