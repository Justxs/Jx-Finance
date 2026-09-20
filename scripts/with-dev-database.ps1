Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

. (Join-Path $PSScriptRoot "dev-env.ps1")
Set-DevEnvironment -Root $root

docker compose up -d --wait db
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL did not start." }

$command = $args[0]
$rest = @($args | Select-Object -Skip 1)
& $command @rest
if ($LASTEXITCODE -ne 0) { throw "$command failed." }
