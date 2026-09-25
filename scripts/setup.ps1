. (Join-Path $PSScriptRoot "dev-env.ps1")
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

$variables = Get-DevEnvironment
$variables["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4317"
New-Item -ItemType Directory -Force (Join-Path $root ".local") | Out-Null
$debugEnv = (@($variables.Keys | ForEach-Object { "$_=$($variables[$_])" }) + "") -join "`n"
[System.IO.File]::WriteAllText((Join-Path $root ".local/api-debug.env"), $debugEnv, $utf8)
Write-Host "Wrote .local/api-debug.env for the VS Code 'API' debug target."

Invoke-Checked { nub install -C frontend --frozen-lockfile } "Installing frontend packages failed."

Push-Location backend
try {
    Invoke-Checked { dotnet tool restore } "Restoring .NET tools failed."
    Invoke-Checked { dotnet restore JxFinance.slnx } "Restoring NuGet packages failed."
}
finally {
    Pop-Location
}

Invoke-Checked { nub exec --cwd frontend lefthook install } "Installing git hooks failed."

& (Join-Path $PSScriptRoot "doctor.ps1")
Write-Host "Ready. Start everything with 'just dev'; after creating the first administrator, 'just seed <email>' adds demo data."
