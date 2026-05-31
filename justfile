set windows-shell := ["powershell", "-NoProfile", "-Command"]

# Start the DB container and run API + frontend dev servers.
dev:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev.ps1

# Fetch OpenAPI and regenerate the frontend client.
gen:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gen-openapi.ps1

# Run backend tests (needs Docker for Testcontainers).
test:
    dotnet test backend/JxFinance.slnx

# Lint and format-check the frontend (Oxc).
lint:
    pnpm --prefix frontend lint
    pnpm --prefix frontend format:check

# Format the frontend in place (Oxc).
fmt:
    pnpm --prefix frontend format

# Bring up the docker stack.
up:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/up.ps1
