Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    throw "pnpm is required. Install it (corepack enable) or switch to npm."
}

$openApiUrl = $env:OPENAPI_URL
if (-not $openApiUrl) {
    $openApiUrl = "http://localhost:8080/swagger/v1/swagger.json"
}

$openApiPath = Join-Path $root "frontend\openapi.json"
Invoke-WebRequest -Uri $openApiUrl -OutFile $openApiPath

pnpm --prefix frontend orval
