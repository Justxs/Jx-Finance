Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".env")) {
    throw "Missing .env file. Copy .env.example to .env first."
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

$api = Start-Process dotnet -ArgumentList "watch --project backend/JxFinance.Api" -WindowStyle Hidden -PassThru
try {
    nub run --cwd frontend dev --host
}
finally {
    if ($api -and -not $api.HasExited) {
        Stop-Process -Id $api.Id
    }
}
