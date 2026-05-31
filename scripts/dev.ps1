Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
    throw "Missing .env file. Copy .env.example to .env and set values first."
}

# Load .env into the process environment so the host-run API gets the same config
# as compose (keys use ASP.NET's __ nesting, e.g. ConnectionStrings__Default).
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    Set-Item -Path "Env:$key" -Value $value
}

# The API runs on the host, not inside the compose network, so it reaches the DB
# via the published port on localhost rather than the compose service name 'db'.
$env:ConnectionStrings__Default = "Host=localhost;Port=5432;Database=$($env:POSTGRES_DB);Username=$($env:POSTGRES_USER);Password=$($env:POSTGRES_PASSWORD)"

. (Join-Path $PSScriptRoot "_ensure-docker.ps1")

docker compose up -d db

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    throw "pnpm is required. Install it (corepack enable) or switch to npm."
}

$env:ASPNETCORE_URLS = "http://localhost:8080"
$apiProcess = Start-Process dotnet -ArgumentList "watch --project backend/JxFinance.Api" -PassThru

try {
    pnpm --prefix frontend dev --host
}
finally {
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id
    }
}
