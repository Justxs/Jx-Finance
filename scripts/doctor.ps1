Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$failures = 0

function Write-Problem([string]$Message) {
    Write-Host $Message -ForegroundColor Red
    $script:failures++
}

function Test-Tool([string]$Name, [string]$Command, [string]$Minimum, [string]$Hint) {
    $found = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-Problem "[missing] $Name - $Hint"
        return
    }
    $output = (& $Command --version 2>$null | Select-Object -First 1)
    $version = $null
    if ("$output" -match '(\d+\.\d+(\.\d+)?)') { $version = [version]$Matches[1] }
    if ($version -and $version -lt [version]$Minimum) {
        Write-Problem "[old]     $Name $version, need $Minimum or newer - $Hint"
        return
    }
    Write-Host "[ok]      $Name $version"
}

Test-Tool ".NET SDK" "dotnet" "10.0.400" "https://dotnet.microsoft.com/download"
Test-Tool "Node.js" "node" "24.0" "https://nodejs.org"
Test-Tool "nub" "nub" "0.9.2" "npm install --global @nubjs/nub@0.9.2"
Test-Tool "Docker" "docker" "24.0" "https://www.docker.com/products/docker-desktop"
Test-Tool "just" "just" "1.0" "winget install Casey.Just"

docker info *> $null
if ($LASTEXITCODE -ne 0) { Write-Problem "[down]    Docker is installed but not running. Start Docker Desktop." }

$shim = Join-Path $env:APPDATA "npm\node"
if ((Test-Path $shim) -and ((Get-Item $shim).Length -lt 1024)) {
    Write-Problem "[broken]  $shim is a placeholder from the global npm package 'node'. Git hooks and nub pick it up under sh and fail with exit 127. Fix: npm uninstall -g node"
}

$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root ".env"))) { Write-Problem "[missing] .env - run 'just setup'" }
if (-not (Test-Path (Join-Path $root "frontend/node_modules"))) { Write-Problem "[missing] frontend/node_modules - run 'just setup'" }
if (-not (Test-Path (Join-Path $root ".git/hooks/pre-commit"))) {
    Write-Host "[missing] git hooks - run 'just hooks'" -ForegroundColor Yellow
}

if ($failures -gt 0) { throw "$failures problem(s) found." }
Write-Host "Everything needed for development is in place."
