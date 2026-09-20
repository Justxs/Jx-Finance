Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".env")) { throw "Missing .env file. Run 'just setup' first." }

$envVars = @{}
foreach ($line in Get-Content ".env") {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}
$env:ConnectionStrings__Default = "Host=localhost;Port=5432;Database=$($envVars['POSTGRES_DB']);Username=$($envVars['POSTGRES_USER']);Password=$($envVars['POSTGRES_PASSWORD'])"
$env:App__BackupDirectory = Join-Path $root ".local/backups"

docker compose up -d --wait db
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL did not start." }

$command = $args[0]
$rest = @($args | Select-Object -Skip 1)
& $command @rest
if ($LASTEXITCODE -ne 0) { throw "$command failed." }
