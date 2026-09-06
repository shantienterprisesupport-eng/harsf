$ErrorActionPreference = "Continue"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$n8nDir = Join-Path $repoRoot "n8n"
Set-Location $n8nDir

Write-Host "=== n8n status ==="
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is not installed."
  exit 1
}

try {
  docker info | Out-Null
} catch {
  Write-Error "Docker Desktop is not running."
  exit 1
}

docker compose ps

Write-Host "=== n8n recent logs ==="
docker compose logs --tail 80 n8n

Write-Host "=== HTTP check ==="
try {
  $response = Invoke-WebRequest -Uri "http://localhost:5678/" -UseBasicParsing -TimeoutSec 5
  Write-Host "HTTP status:" $response.StatusCode
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
    Write-Host "n8n is reachable."
    exit 0
  }
} catch {
  Write-Error "n8n is not reachable at http://localhost:5678"
  exit 1
}
