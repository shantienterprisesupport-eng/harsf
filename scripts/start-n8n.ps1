$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$n8nDir = Join-Path $repoRoot "n8n"
Set-Location $n8nDir

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop is required. Install/start Docker Desktop, then run npm run n8n:start again."
}

try {
  docker info | Out-Null
} catch {
  throw "Docker is installed but not running. Start Docker Desktop and retry."
}

$envFile = Join-Path $n8nDir ".env"
if (-not (Test-Path $envFile)) {
  Copy-Item ".env.example" $envFile
}

$envText = Get-Content $envFile -Raw
if ($envText -match "N8N_ENCRYPTION_KEY=replace-with-a-long-random-secret-on-the-server" -or
    $envText -match "N8N_ENCRYPTION_KEY=\s*(\r?\n|$)") {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $secret = [Convert]::ToBase64String($bytes).Replace("+", "-").Replace("/", "_").TrimEnd("=")
  $envText = [regex]::Replace(
    $envText,
    "N8N_ENCRYPTION_KEY=.*",
    "N8N_ENCRYPTION_KEY=$secret"
  )
  Set-Content -Path $envFile -Value $envText -NoNewline
  Write-Host "Created a private local n8n encryption key in n8n/.env (not committed)."
}

Write-Host "Starting n8n..."
docker compose up -d

$healthy = $false
for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep -Seconds 2
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:5678/" -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $healthy = $true
      break
    }
  } catch {
    # n8n may still be starting.
  }
}

if (-not $healthy) {
  Write-Warning "n8n did not become reachable yet. Run npm run n8n:status to see container/log details."
  exit 1
}

Write-Host "n8n is reachable at http://localhost:5678"
Write-Host "Next: open n8n in the browser and add credentials there. Never paste real API keys into GitHub files."
