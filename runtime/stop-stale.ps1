$ErrorActionPreference = 'SilentlyContinue'

$root = (Split-Path $PSScriptRoot -Parent).ToLowerInvariant()
$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -and (
    $_.CommandLine.ToLowerInvariant().Contains($root) -or
    $_.CommandLine -match 'runtime[\\/]worker\.mjs' -or
    $_.CommandLine -match 'runtime[\\/]api\.mjs'
  )
}

foreach ($process in $targets) {
  try {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped stale HARSF process $($process.ProcessId)" -ForegroundColor DarkGray
  } catch {}
}

# A force-stopped process can leave the queue lock behind. Remove only this
# HARSF-owned transient lock so the fresh worker/API can start immediately.
$lockFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.harsf-runtime\queue.lock'
if (Test-Path $lockFile) {
  try {
    Remove-Item $lockFile -Force -ErrorAction Stop
    Write-Host 'Removed stale HARSF queue lock.' -ForegroundColor DarkGray
  } catch {}
}

Start-Sleep -Milliseconds 700
