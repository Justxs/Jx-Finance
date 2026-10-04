set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

export_connection := "Host=localhost;Database=export;Username=export;Password=export"

# List the recipes.
default:
    just --list

# First checkout: create .env with a generated password, install packages and tools, install git hooks, verify the machine.
[group('dev')]
setup:
    & scripts/setup.ps1

# Verify the tools this repository needs (versions, Docker running, known broken shims).
[group('dev')]
doctor:
    & scripts/doctor.ps1

# Run Postgres (Docker) + API + frontend dev servers in one terminal; waits for the API before starting Vite.
[group('dev')]
dev:
    & scripts/dev.ps1

# Storybook on http://localhost:6006.
[group('dev')]
storybook:
    nub run --cwd frontend storybook

# Add six months of demo accounts, transactions, budgets, goals and bills to an existing empty user of the dev database.
[group('db')]
seed email:
    & scripts/with-dev-database.ps1 dotnet run --project backend/JxFinance.Api -c Release -- --seed-demo {{email}}

# Drop the dev database volume and start an empty PostgreSQL; the API migrates on its next start.
[confirm("This deletes every row in the dev database. Continue?")]
[group('db')]
db-reset:
    docker compose rm --stop --force db
    $project = (docker compose config --format json | ConvertFrom-Json).name; docker volume rm "${project}_db_data"
    docker compose up -d --wait db

# Create an EF migration from the current model after a clean Release build; strips the BOM and CRLF EF writes, and removes the migration and fails when its Up and Down are empty.
[group('db')]
migrate-add name:
    node scripts/migrate-add.mjs {{name}}

# Remove the last EF migration (only before it was applied anywhere).
[group('db')]
migrate-remove:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations remove --configuration Release --project JxFinance.Api

# List EF migrations.
[group('db')]
migrate-list:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations list --configuration Release --project JxFinance.Api --no-connect

# Print the idempotent SQL script for every migration.
[group('db')]
migrate-script:
    cd backend; $env:ConnectionStrings__Default = "{{export_connection}}"; dotnet ef migrations script --configuration Release --idempotent --project JxFinance.Api

# Export the API contract from the backend build on a free port (no database needed; works while the dev API runs) into frontend/openapi.json and regenerate the frontend client, MSW handlers, zod schemas and the route list in docs/api.md.
[group('gen')]
gen:
    node scripts/gen.mjs

# Regenerate only the frontend code and the route list in docs/api.md from the contract already in frontend/openapi.json.
[group('gen')]
gen-client:
    nub run --cwd frontend orval
    node scripts/api-docs.mjs

# Fail when the committed contract, generated client or docs/api.md route list differs from what the backend produces now.
[group('gen')]
gen-check:
    node scripts/gen.mjs --check

# Scaffold a backend endpoint slice and its integration test; --service adds the method to the tag's service and calls it, --collection=<Name> picks the test collection of a tag without tests: just new-endpoint Goals ArchiveGoal post "goals/{id}/archive" --service.
[group('scaffold')]
new-endpoint tag name verb route *flags:
    node scripts/new-endpoint.mjs {{tag}} {{name}} {{verb}} "{{route}}" {{flags}}

# Scaffold a frontend feature component with its default, empty, loading and server error stories and a DOM test: just new-component goals goal-archive-dialog.
[group('scaffold')]
new-component feature name:
    node scripts/new-component.mjs {{feature}} {{name}}

# Everything CI checks except the end-to-end tests (just e2e): backend format, build and tests, contract drift, frontend types, lint, format, tests, story tests, and the app and Storybook builds.
[group('check')]
check: format-check-backend test gen-check check-frontend test-stories
    nub run --cwd frontend build
    nub run --cwd frontend build-storybook

# The quick loop without Docker: docs links, backend format, build, unit and architecture tests, frontend types, lint, format and unit tests.
[group('check')]
check-fast: check-docs format-check-backend check-frontend test-unit

# Check only what changed against HEAD (staged, unstaged, untracked): Oxlint, oxfmt and tsc for frontend files, backend format and test-unit for backend files, check-docs for Markdown.
[group('check')]
check-changed:
    node scripts/check-changed.mjs

# Frontend types, lint, format and tests.
[group('check')]
check-frontend:
    nub exec --cwd frontend tsc -b
    nub run --cwd frontend lint
    nub run --cwd frontend format:check
    nub run --cwd frontend test

# Fail on a broken link or heading anchor in the Markdown docs, a docs file name with spaces or capitals, a line too long for an agent to read whole, a code path or type name in docs/ or AGENTS.md the code no longer has, a stale route list in docs/api.md, and DESIGN.md naming a component, path, CSS variable or color the code no longer has.
[group('check')]
check-docs:
    node scripts/check-docs.mjs

# Render the PlantUML system diagrams in docs/architecture/diagrams to SVG; needs Java and downloads the pinned PlantUML jar to .local on first use.
[group('dev')]
diagrams:
    node scripts/render-diagrams.mjs

# Fail when backend code is not formatted or breaks a code style rule.
[group('check')]
format-check-backend:
    node scripts/format-backend.mjs --check

# Install the git hooks from lefthook.yml.
[group('dev')]
hooks:
    nub exec --cwd frontend lefthook install

# Run backend tests (needs Docker for Testcontainers).
[group('test')]
test:
    cd backend; dotnet tool restore
    dotnet test --solution backend/JxFinance.slnx -c Release

# Run the backend unit and architecture tests only; no Docker needed.
[group('test')]
test-unit:
    dotnet test --project backend/JxFinance.Tests -c Release --filter-namespace JxFinance.Tests.Unit --filter-namespace JxFinance.Tests.Architecture

# Run one backend test class by its name: just test-class AllocationBucketTests.
[group('test')]
test-class name:
    dotnet test --project backend/JxFinance.Tests -c Release --filter-class "*.{{name}}"

# Run one backend test method by its name: just test-method A_security_key_is_its_id_in_lower_case_with_hyphens.
[group('test')]
test-method name:
    dotnet test --project backend/JxFinance.Tests -c Release --filter-method "*.{{name}}"

# Run the frontend unit and DOM tests of one file or folder, relative to frontend: just test-fe src/lib/budgets.test.ts.
[group('test')]
test-fe path:
    nub exec --cwd frontend vitest run --project unit --project dom {{path}}

# Every story's play function and an axe scan, run in jsdom by Vitest (no browser needed).
[group('test')]
test-stories:
    nub run --cwd frontend test:stories

e2e_compose := "docker compose -f docker-compose.yml -f docker-compose.e2e.yml"

# End-to-end smoke tests against a throwaway Docker stack (project jx-e2e, http://localhost:8089, own volumes); the dev database is never touched. The stack stays up after a failure for debugging.
[group('test')]
e2e: e2e-down
    {{e2e_compose}} up -d --build --wait
    nub run --cwd frontend e2e
    {{e2e_compose}} down --volumes

# Remove the throwaway end-to-end stack and its volumes.
[group('test')]
e2e-down:
    {{e2e_compose}} down --volumes

# Download the Chromium build Playwright uses for the end-to-end tests.
[group('test')]
e2e-install:
    nub exec --cwd frontend playwright install chromium

# Auto-fix lint issues and format the frontend (Oxc) and the backend (dotnet format).
[group('check')]
fix:
    nub run --cwd frontend lint --fix
    nub run --cwd frontend format
    node scripts/format-backend.mjs

# Build and start the full Docker stack with the Aspire dashboard on http://localhost:18888 receiving the API's logs, traces and metrics.
[group('dev')]
up:
    $env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://aspire:18889"; docker compose --profile telemetry up -d --build

# Stop the Docker stack and the Aspire dashboard.
[group('dev')]
down:
    docker compose --profile telemetry down

# Bring up the production overlay as a throwaway stack (project jx-verify, https://127.0.0.1:8443, own volumes) and assert: only 443 is published, security headers, Secure cookies, a session that survives recreating the API container, host filtering. CI runs the same script.
[group('release')]
verify-production:
    node scripts/verify-production.mjs

# Move every pinned Docker base image (compose file and both Dockerfiles) to the newest patch tag and its digest; just update-images --check only reports.
[group('release')]
update-images *flags:
    node scripts/update-images.mjs {{flags}}

# Fail on a NuGet package or a shipped frontend package with a known vulnerability; development-only frontend packages are listed without failing.
[group('release')]
audit:
    node scripts/audit.mjs
