Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

. (Join-Path $PSScriptRoot "_ensure-docker.ps1")

docker compose up -d --build
