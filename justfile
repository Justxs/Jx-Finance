set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

# Run Postgres (Docker) + API + frontend dev servers.
dev:
    & scripts/dev.ps1

# Regenerate the frontend API client from the running API's OpenAPI spec.
gen:
    Invoke-WebRequest http://localhost:8091/openapi/v1.json -OutFile frontend/openapi.json
    nub run --cwd frontend orval

# Run backend tests (needs Docker for Testcontainers).
test:
    cd backend; dotnet tool restore
    dotnet test --solution backend/JxFinance.slnx

# Auto-fix lint issues and format the frontend (Oxc).
fix:
    nub run --cwd frontend lint --fix
    nub run --cwd frontend format

# Build and start the full Docker stack.
up:
    docker compose up -d --build

# Stop the Docker stack.
down:
    docker compose down
