Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Invoke-Checked([scriptblock]$Action, [string]$Failure) {
    & $Action
    if ($LASTEXITCODE -ne 0) { throw $Failure }
}

function Get-DevEnvironment {
    $envFile = Join-Path $root ".env"
    if (-not (Test-Path $envFile)) {
        throw "Missing .env file. Run 'just setup' or copy .env.example to .env first."
    }

    $envVars = @{}
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*([^#=]+)=(.*)$') {
            $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }

    $variables = [ordered]@{}
    $variables["ConnectionStrings__Default"] = "Host=localhost;Port=5432;Database=$($envVars['POSTGRES_DB']);Username=$($envVars['POSTGRES_USER']);Password=$($envVars['POSTGRES_PASSWORD'])"
    $variables["App__BackupDirectory"] = Join-Path $root ".local/backups"
    $variables["App__AttachmentDirectory"] = Join-Path $root ".local/attachments"
    return $variables
}

function Set-DevEnvironment {
    $variables = Get-DevEnvironment
    foreach ($name in $variables.Keys) {
        Set-Item -Path "env:$name" -Value $variables[$name]
    }
}
