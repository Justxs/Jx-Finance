set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

# Run Postgres (Docker) + API + frontend dev servers.
dev:
    & scripts/dev.ps1

# Export the OpenAPI spec from the backend build (no running API needed) and regenerate the frontend client, MSW handlers and zod schemas.
gen:
    $env:ConnectionStrings__Default = "Host=localhost;Database=export;Username=export;Password=export"; dotnet run --project backend/JxFinance.Api --export-openapi-docs true
    Copy-Item backend/JxFinance.Api/wwwroot/openapi/v1.json frontend/openapi.json
    nub run --cwd frontend orval

# Regenerate only the frontend code from the spec already in frontend/openapi.json.
gen-client:
    nub run --cwd frontend orval

# Fail when the committed generated client differs from what the backend produces now.
gen-check: gen
    if (git status --porcelain -- frontend/src/api/generated frontend/src/api/schemas) { git status --short -- frontend/src/api/generated frontend/src/api/schemas; throw "Generated API client is out of date; commit the result of just gen." }

# Everything CI checks, in the same order: backend build and tests, client drift, frontend types, lint, format, tests.
check: test gen-check
    nub exec --cwd frontend tsc -b
    nub run --cwd frontend lint
    nub run --cwd frontend format:check
    nub run --cwd frontend test

# Install the git hooks from lefthook.yml (format and lint staged files, typecheck before push).
hooks:
    nub exec --cwd frontend lefthook install

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
