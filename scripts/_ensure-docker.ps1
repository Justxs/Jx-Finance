# Ensure the docker CLI is callable. Docker Desktop adds its bin to PATH on install,
# but existing terminals don't see it until a new session — fall back to the standard
# install path. Dot-source this (. ./_ensure-docker.ps1) so the PATH change sticks.
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $dockerBin = Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"
    if (Test-Path (Join-Path $dockerBin "docker.exe")) {
        $env:PATH = "$dockerBin;$env:PATH"
    }
    else {
        throw "docker not found. Install Docker Desktop, or open a new terminal so PATH picks it up."
    }
}
