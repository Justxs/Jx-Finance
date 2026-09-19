<img src="frontend/public/brand/mark.svg" alt="" width="56" height="56" align="left" />

# Jx Finance

A self-hosted EUR finance tracker: accounts, transactions and splits, transfers, budgets, goals, recurring bills, household sharing, net worth, reports and Swedbank CSV import. React/TypeScript frontend, ASP.NET Core 10 API and PostgreSQL 16.

## Local development (Windows)

Install .NET 10 SDK, Node.js 24+ and [nub 0.9.2](https://nubjs.com/docs/install), Docker Desktop with Linux containers, and optionally `just`.

```powershell
npm install --global @nubjs/nub@0.9.2
Copy-Item .env.example .env
# Edit .env and choose a database password; keep its connection string consistent.
nub install -C frontend --frozen-lockfile
./scripts/dev.ps1
```

The script starts PostgreSQL and waits for it to become healthy, then starts the API and Vite. Open http://localhost:5173 and create the first administrator. Subsequent users are created from Users by an administrator. API documentation is at http://localhost:8091/scalar/v1. The script also starts the .NET Aspire dashboard at http://localhost:18888, which shows API logs, traces and metrics. `just dev` runs the same script.

Nub is pinned in `frontend/package.json`; commit `frontend/nub.lock` when dependencies change. npm is only used above to bootstrap the nub CLI. `frontend/nub.jsonc` keeps standard Node behavior so Vite and the tests retain their existing loaders and environment handling.

## Checks

```powershell
dotnet test --solution backend/JxFinance.slnx
nub run --cwd frontend test
nub run --cwd frontend lint
nub run --cwd frontend format:check
nub run --cwd frontend build
```

Backend integration tests start an isolated PostgreSQL 16 container through Testcontainers. To use a separate disposable PostgreSQL instance, set `JX_TEST_POSTGRES` to its connection string; its database name must begin with `jx_test_`. The fixture migrates and writes test data into that database. Never point it at application data. Unset the variable to return to Testcontainers.

Backend coverage uses the Microsoft Testing Platform extension; the report lands in `backend/TestResults` (ignored by Git):

```powershell
dotnet test backend/JxFinance.Tests -- --coverage --coverage-output-format cobertura --coverage-output coverage.cobertura.xml
```

`ApiDocsTests` validates `/openapi/v1.json` with [Microsoft.OpenApi.Hidi](https://www.nuget.org/packages/Microsoft.OpenApi.Hidi), a local tool pinned in `backend/dotnet-tools.json`; run `dotnet tool restore` in `backend` once per checkout. The same tests compare the document with the approved contract in `backend/JxFinance.Tests/Integration/Diagnostics/Snapshots/openapi-v1.json`. After an intentional API change, run the backend tests once with `JX_UPDATE_SNAPSHOTS=1`, review the diff, commit the snapshot and regenerate the frontend client.

With the API running, `just gen` refreshes the OpenAPI document and generated frontend client. The CI workflow also checks client drift.

## Docker

```powershell
docker compose up -d --build --wait
```

Open http://localhost:8081. Database and API ports bind to loopback. The database lives in `db_data`; authentication keys live in `auth_keys`. Startup applies EF migrations. The app includes no database backup or restore feature.

For private HTTPS, set `SITE_ADDRESS` to your internal hostname and `BIND_ADDRESS` to the server's private interface address in `.env`, then run:

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build --wait
```

Map the hostname to that server and trust the Caddy internal CA on client devices. The overlay enables HTTPS and secure cookies and persists Caddy state. Run one API instance. See [deployment notes](docs/7.%20Architecture%20notes.md) for details.

## Administrator access recovery

With PostgreSQL running and the schema migrated:

```powershell
docker compose run --rm --no-deps -it api --recover-admin admin@example.com
```

Enter and confirm a new password interactively. This resets an existing administrator's password and 2FA, clears lockout, and revokes sessions. It does not create users. Email delivery and self-service email password reset are outside this release.

The [documentation index](docs/0.%20Home.md) describes current behavior and scope. [Verification evidence](docs/12.%20Verification.md) records the checks actually completed and any remaining limitations.
