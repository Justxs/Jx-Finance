set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

export_connection := "Host=localhost;Database=export;Username=export;Password=export"

# List the recipes.
default:
    just --list

# First checkout: create .env with a generated password, install packages and tools, install git hooks, verify the machine.
setup:
    & scripts/setup.ps1

# Verify the tools this repository needs (versions, Docker running, known broken shims).
doctor:
    & scripts/doctor.ps1

# Run Postgres (Docker) + API + frontend dev servers in one terminal; waits for the API before starting Vite.
dev:
    & scripts/dev.ps1

# Storybook on http://localhost:6006.
storybook:
    nub run --cwd frontend storybook

# Add six months of demo accounts, transactions, budgets, goals and bills to an existing empty user of the dev database.
seed email:
    & scripts/with-dev-database.ps1 dotnet run --project backend/JxFinance.Api -c Release -- --seed-demo {{email}}

# Drop the dev database volume and start an empty PostgreSQL; the API migrates on its next start.
[confirm("This deletes every row in the dev database. Continue?")]
db-reset:
    docker compose rm --stop --force db
    $project = (docker compose config --format json | ConvertFrom-Json).name; docker volume rm "${project}_db_data"
    docker compose up -d --wait db

# Create an EF migration from the current model.
migrate-add name:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations add --configuration Release {{name}} --project JxFinance.Api --output-dir Infrastructure/Data/Migrations

# Remove the last EF migration (only before it was applied anywhere).
migrate-remove:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations remove --configuration Release --project JxFinance.Api

# List EF migrations.
migrate-list:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations list --configuration Release --project JxFinance.Api --no-connect

# Print the idempotent SQL script for every migration.
migrate-script:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations script --configuration Release --idempotent --project JxFinance.Api

# Export the API contract from the backend build (no running API or database needed) into frontend/openapi.json and regenerate the frontend client, MSW handlers and zod schemas.
gen:
    node scripts/gen.mjs

# Regenerate only the frontend code from the contract already in frontend/openapi.json.
gen-client:
    nub run --cwd frontend orval

# Fail when the committed contract or generated client differs from what the backend produces now.
gen-check:
    node scripts/gen.mjs --check

# Scaffold a backend endpoint slice: just new-endpoint Goals ArchiveGoal post "goals/{id}/archive".
new-endpoint tag name verb route:
    node scripts/new-endpoint.mjs {{tag}} {{name}} {{verb}} "{{route}}"

# Scaffold a frontend feature component with its story and test: just new-component goals goal-archive-dialog.
new-component feature name:
    node scripts/new-component.mjs {{feature}} {{name}}

# Everything CI checks except the end-to-end tests (just e2e): backend format, build and tests, contract drift, frontend types, lint, format, tests, story tests, app and Storybook builds.
check: format-check-backend test gen-check check-frontend test-stories
    nub run --cwd frontend build
    nub run --cwd frontend build-storybook

# The quick loop without Docker: backend format and build, frontend types, lint, format and unit tests.
check-fast: format-check-backend check-frontend
    dotnet build backend/JxFinance.slnx -c Release

# Frontend types, lint, format and tests.
check-frontend:
    nub exec --cwd frontend tsc -b
    nub run --cwd frontend lint
    nub run --cwd frontend format:check
    nub run --cwd frontend test

# Fail when backend code is not formatted or breaks a code style rule.
format-check-backend:
    node scripts/format-backend.mjs --check

# Install the git hooks from lefthook.yml.
hooks:
    nub exec --cwd frontend lefthook install

# Run backend tests (needs Docker for Testcontainers).
test:
    cd backend; dotnet tool restore
    dotnet test --solution backend/JxFinance.slnx -c Release

# Every story's play function and an axe scan, run in jsdom by Vitest (no browser needed).
test-stories:
    nub run --cwd frontend test:stories

e2e_compose := "docker compose -f docker-compose.yml -f docker-compose.e2e.yml"

# End-to-end smoke tests against a throwaway Docker stack (project jx-e2e, http://localhost:8089, own volumes); the dev database is never touched. The stack stays up after a failure for debugging.
e2e: e2e-down
    {{e2e_compose}} up -d --build --wait
    nub run --cwd frontend e2e
    {{e2e_compose}} down --volumes

# Remove the throwaway end-to-end stack and its volumes.
e2e-down:
    {{e2e_compose}} down --volumes

# Download the Chromium build Playwright uses for the end-to-end tests.
e2e-install:
    nub exec --cwd frontend playwright install chromium

# Auto-fix lint issues and format the frontend (Oxc) and the backend (dotnet format).
fix:
    nub run --cwd frontend lint --fix
    nub run --cwd frontend format
    node scripts/format-backend.mjs

# Build and start the full Docker stack.
up:
    docker compose up -d --build

# Stop the Docker stack.
down:
    docker compose down

# Bring up the production overlay as a throwaway stack (project jx-verify, https://127.0.0.1:8443, own volumes) and assert: only 443 is published, security headers, Secure cookies, a session that survives recreating the API container, host filtering. CI runs the same script.
verify-production:
    node scripts/verify-production.mjs

# Move every pinned Docker base image (compose file and both Dockerfiles) to the newest patch tag and its digest; just update-images --check only reports.
update-images *flags:
    node scripts/update-images.mjs {{flags}}

# Fail on a NuGet package or a shipped frontend package with a known vulnerability; development-only frontend packages are listed without failing.
audit:
    node scripts/audit.mjs
