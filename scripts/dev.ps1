Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".env")) {
    throw "Missing .env file. Run 'just setup' or copy .env.example to .env first."
}

$envVars = @{}
foreach ($line in Get-Content ".env") {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

$env:ConnectionStrings__Default = "Host=localhost;Port=5432;Database=$($envVars['POSTGRES_DB']);Username=$($envVars['POSTGRES_USER']);Password=$($envVars['POSTGRES_PASSWORD'])"
$env:ASPNETCORE_URLS = "http://localhost:8091"
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"

docker compose up -d --wait db aspire
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL or the Aspire dashboard did not start." }

$api = Start-Process dotnet -ArgumentList "watch --project backend/JxFinance.Api --non-interactive" -NoNewWindow -PassThru
try {
    Write-Host "Waiting for the API at http://localhost:8091/health ..."
    $deadline = (Get-Date).AddMinutes(3)
    $healthy = $false
    while (-not $healthy) {
        if ($api.HasExited) { throw "The API stopped during startup. Its output is above." }
        if ((Get-Date) -gt $deadline) { throw "The API did not become healthy within 3 minutes. Its output is above." }
        try {
            $response = Invoke-WebRequest "http://localhost:8091/health" -UseBasicParsing -TimeoutSec 2
            $healthy = $response.StatusCode -eq 200
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }
    Write-Host "API is healthy. App: http://localhost:5173  API docs: http://localhost:8091/scalar/v1  Telemetry: http://localhost:18888"
    nub run --cwd frontend dev --host
}
finally {
    if ($api -and -not $api.HasExited) {
        taskkill /T /F /PID $api.Id | Out-Null
    }
}
