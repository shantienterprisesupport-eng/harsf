@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo HARSF MCP is not set up yet.
  echo Run: npm run agents:setup
  pause
  exit /b 1
)

echo Starting HARSF Scoped MCP server...
echo Workspace: this HARSF repository only
echo Secrets and .env files: blocked
echo Project memory: local only, not committed to Git
".venv\Scripts\python.exe" ".\mcp_server\harsf_server.py"

if errorlevel 1 (
  echo.
  echo MCP server stopped with an error.
  pause
)
endlocal
