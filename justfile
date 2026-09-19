set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

# Run Postgres (Docker) + API + frontend dev servers.
dev:
    & scripts/dev.ps1

# Export the OpenAPI spec from the backend build (no running API needed) and regenerate the frontend client, MSW handlers and zod schemas.
gen:
    $env:ConnectionStrings__Default = "Host=localhost;Database=export;Username=export;Password=export"; dotnet run --project backend/JxFinance.Api -c Release --export-openapi-docs true
    Copy-Item backend/JxFinance.Api/wwwroot/openapi/v1.json frontend/openapi.json
    nub run --cwd frontend orval

# Regenerate only the frontend code from the spec already in frontend/openapi.json.
gen-client:
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
