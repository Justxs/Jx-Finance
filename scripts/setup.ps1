Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$utf8 = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path ".env")) {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $password = [Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', ''
    $text = [System.IO.File]::ReadAllText((Join-Path $root ".env.example")).Replace("change-me", $password)
    [System.IO.File]::WriteAllText((Join-Path $root ".env"), $text, $utf8)
    Write-Host "Created .env with a generated database password."
}
else {
    Write-Host ".env already exists; left untouched."
}

$envVars = @{}
foreach ($line in Get-Content ".env") {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}
New-Item -ItemType Directory -Force (Join-Path $root ".local") | Out-Null
$debugEnv = @(
    "ConnectionStrings__Default=Host=localhost;Port=5432;Database=$($envVars['POSTGRES_DB']);Username=$($envVars['POSTGRES_USER']);Password=$($envVars['POSTGRES_PASSWORD'])",
    "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317",
    "App__BackupDirectory=$(Join-Path $root '.local/backups')",
    ""
) -join "`n"
[System.IO.File]::WriteAllText((Join-Path $root ".local/api-debug.env"), $debugEnv, $utf8)
Write-Host "Wrote .local/api-debug.env for the VS Code 'API' debug target."

nub install -C frontend --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "Installing frontend packages failed." }

Push-Location backend
try {
    dotnet tool restore
    if ($LASTEXITCODE -ne 0) { throw "Restoring .NET tools failed." }
    dotnet restore JxFinance.slnx
    if ($LASTEXITCODE -ne 0) { throw "Restoring NuGet packages failed." }
}
finally {
    Pop-Location
}

nub exec --cwd frontend lefthook install
if ($LASTEXITCODE -ne 0) { throw "Installing git hooks failed." }

& (Join-Path $PSScriptRoot "doctor.ps1")
Write-Host "Ready. Start everything with 'just dev'; after creating the first administrator, 'just seed <email>' adds demo data."
