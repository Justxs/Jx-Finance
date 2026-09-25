. (Join-Path $PSScriptRoot "dev-env.ps1")
Set-DevEnvironment

Invoke-Checked { docker compose up -d --wait db } "PostgreSQL did not start."

$command = $args[0]
$rest = @($args | Select-Object -Skip 1)
Invoke-Checked { & $command @rest } "$command failed."
