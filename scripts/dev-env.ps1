function Get-DevEnvironment {
    param([Parameter(Mandatory = $true)][string]$Root)

    $envFile = Join-Path $Root ".env"
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
    $variables["App__BackupDirectory"] = Join-Path $Root ".local/backups"
    return $variables
}

function Set-DevEnvironment {
    param([Parameter(Mandatory = $true)][string]$Root)

    $variables = Get-DevEnvironment -Root $Root
    foreach ($name in $variables.Keys) {
        Set-Item -Path "env:$name" -Value $variables[$name]
    }
}
