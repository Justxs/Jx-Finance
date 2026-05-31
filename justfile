set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

# Run Postgres (Docker) + API + frontend dev servers.
dev:
    & scripts/dev.ps1

# Regenerate the frontend API client from the running API's OpenAPI spec.
gen:
    Invoke-WebRequest http://localhost:8080/swagger/v1/swagger.json -OutFile frontend/openapi.json
    pnpm --prefix frontend orval

# Run backend tests (needs Docker for Testcontainers).
test:
    dotnet test backend/JxFinance.slnx

# Auto-fix lint issues and format the frontend (Oxc).
fix:
    pnpm --prefix frontend lint --fix
    pnpm --prefix frontend format

# Build and start the full Docker stack.
up:
    docker compose up -d --build

# Stop the Docker stack.
down:
    docker compose down
