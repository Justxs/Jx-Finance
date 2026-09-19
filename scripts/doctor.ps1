Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$failures = 0

function Test-Tool([string]$Name, [string]$Command, [string]$Minimum, [string]$Hint) {
    $found = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-Host "[missing] $Name - $Hint" -ForegroundColor Red
        $script:failures++
        return
    }
    $output = (& $Command --version 2>$null | Select-Object -First 1)
    $version = $null
    if ("$output" -match '(\d+\.\d+(\.\d+)?)') { $version = [version]$Matches[1] }
    if ($version -and $version -lt [version]$Minimum) {
        Write-Host "[old]     $Name $version, need $Minimum or newer - $Hint" -ForegroundColor Red
        $script:failures++
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
if ($LASTEXITCODE -ne 0) {
    Write-Host "[down]    Docker is installed but not running. Start Docker Desktop." -ForegroundColor Red
    $failures++
}

$shim = Join-Path $env:APPDATA "npm\node"
if ((Test-Path $shim) -and ((Get-Item $shim).Length -lt 1024)) {
    Write-Host "[broken]  $shim is a placeholder from the global npm package 'node'. Git hooks and nub pick it up under sh and fail with exit 127. Fix: npm uninstall -g node" -ForegroundColor Red
    $failures++
}

$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root ".env"))) {
    Write-Host "[missing] .env - run 'just setup'" -ForegroundColor Red
    $failures++
}
if (-not (Test-Path (Join-Path $root "frontend/node_modules"))) {
    Write-Host "[missing] frontend/node_modules - run 'just setup'" -ForegroundColor Red
    $failures++
}
if (-not (Test-Path (Join-Path $root ".git/hooks/pre-commit"))) {
    Write-Host "[missing] git hooks - run 'just hooks'" -ForegroundColor Yellow
}

if ($failures -gt 0) { throw "$failures problem(s) found." }
Write-Host "Everything needed for development is in place."
