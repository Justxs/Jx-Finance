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

docker compose up -d db

$api = Start-Process dotnet -ArgumentList "watch --project backend/JxFinance.Api" -PassThru
try {
    pnpm --prefix frontend dev --host
}
finally {
    if ($api -and -not $api.HasExited) {
        Stop-Process -Id $api.Id
    }
}
