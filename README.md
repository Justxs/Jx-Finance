<img src="frontend/public/brand/mark.svg" alt="" width="56" height="56" align="left" />

# Jx Finance

A self-hosted EUR finance tracker: accounts, transactions and splits, transfers, budgets, goals, recurring bills, household sharing, net worth, reports and Swedbank CSV import. React/TypeScript frontend, ASP.NET Core 10 API and PostgreSQL 16.

## Local development (Windows)

Install .NET 10 SDK (10.0.400 or newer), Node.js 24+, [nub 0.9.2](https://nubjs.com/docs/install), Docker Desktop with Linux containers, and [just](https://just.systems).

```powershell
npm install --global @nubjs/nub@0.9.2
just setup
just dev
```

`just setup` creates `.env` with a generated database password, installs frontend packages, .NET tools and the git hooks, and verifies the machine (`just doctor` repeats that check on its own). `just dev` starts PostgreSQL and the .NET Aspire dashboard, then the API, and starts Vite once the API is healthy; API output stays in the same terminal. Open http://localhost:5173 and create the first administrator. Subsequent users are created from Users by an administrator. API documentation is at http://localhost:8091/scalar/v1, logs, traces and metrics at http://localhost:18888.

`just seed <email>` adds six months of demo data to an existing user without accounts; `just db-reset` deletes the dev database. `just` lists every recipe, including the EF migration ones (`just migrate-add <Name>`).

Nub is pinned in `frontend/package.json`; commit `frontend/nub.lock` when dependencies change. npm is only used above to bootstrap the nub CLI. `frontend/nub.jsonc` keeps standard Node behavior so Vite and the tests retain their existing loaders and environment handling. NuGet versions live in `backend/Directory.Packages.props`.

## Checks

```powershell
just check-fast
just check
just test-stories
just e2e
```

`check-fast` needs no Docker: backend format and build, frontend types, lint, format, unit and DOM tests. `check` is what CI runs apart from the end-to-end tests: it adds the backend tests, API contract drift, the story tests and the app and Storybook builds. `test-stories` runs every Storybook story's `play` function and an accessibility scan in jsdom, without a browser; Storybook itself (`just storybook`) is for reviewing the interface by eye, colour contrast included. `e2e` runs Playwright smoke tests against a throwaway Docker stack on port 8089 that never touches the dev database and needs `just e2e-install` once. [Adding a feature end to end](docs/13.%20Adding%20a%20feature.md) shows where each check fits.

Backend integration tests start an isolated PostgreSQL 16 container through Testcontainers. To use a separate disposable PostgreSQL instance, set `JX_TEST_POSTGRES` to its connection string; its database name must begin with `jx_test_`. The fixture migrates and writes test data into that database. Never point it at application data. Unset the variable to return to Testcontainers.

Backend coverage uses the Microsoft Testing Platform extension; the report lands in `backend/TestResults` (ignored by Git):

```powershell
dotnet test --solution backend/JxFinance.slnx -- --coverage --coverage-output-format cobertura --coverage-output coverage.cobertura.xml
```

`ApiDocsTests` validates `/openapi/v1.json` with [Microsoft.OpenApi.Hidi](https://www.nuget.org/packages/Microsoft.OpenApi.Hidi), a local tool pinned in `backend/dotnet-tools.json`, and compares the document with the committed contract in `frontend/openapi.json`. After an intentional API change run `just gen`: it exports the contract straight from the backend build (no running API or database needed) and regenerates the frontend client, MSW handlers and zod schemas; review and commit the contract together with the generated code. `just gen-client` reruns only the frontend half. CI runs the same export and fails on drift. See "API contract and generated client" in `docs/7. Architecture notes.md`.

## Docker

```powershell
docker compose up -d --build --wait
```

Open http://localhost:8081. Database and API ports bind to loopback. The database lives in `db_data`; authentication keys live in `auth_keys`; files attached to transactions live in `attachments`. Startup applies EF migrations. Backups taken from Settings live in the `backups` volume; an administrator can take, download, upload, restore and delete them there, see `docs/7. Architecture notes.md`. Nothing is scheduled and nothing leaves the server on its own, so download a copy now and then.

For private HTTPS, set `SITE_ADDRESS` to your internal hostname and `BIND_ADDRESS` to the server's private interface address in `.env`, then run:

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build --wait
```

Map the hostname to that server and trust the Caddy internal CA on client devices. The overlay enables HTTPS and secure cookies, persists Caddy state, publishes only port 443 (`HTTPS_PORT` changes it; the database and API ports are not published) and restricts the API to requests for `SITE_ADDRESS`, which must be a bare hostname. Run one API instance. The signing key, the Data Protection keys, the backups and the attached receipts are plain files on their volumes: encrypt the host disk and keep the Docker volume directory root-only, see "Secrets at rest" in [quality requirements](docs/8.%20Non-functional%20requirements.md). See [deployment notes](docs/7.%20Architecture%20notes.md) for details.

`just verify-production` starts that overlay as a throwaway stack on https://127.0.0.1:8443 and checks ports, headers, Secure cookies and that a session survives recreating the API container; CI runs the same script. `just audit` lists packages with known vulnerabilities. Base images are pinned by digest; `just update-images` moves them to the newest patch release, and the weekly update pull request does the same.

## Administrator access recovery

With PostgreSQL running and the schema migrated:

```powershell
docker compose run --rm --no-deps -it api --recover-admin admin@example.com
```

Enter and confirm a new password interactively. This resets an existing administrator's password and 2FA, clears lockout, and revokes sessions. It does not create users. Email delivery and self-service email password reset are outside this release.

The [documentation index](docs/0.%20Home.md) describes current behavior and scope. [Verification evidence](docs/12.%20Verification.md) records the checks actually completed and any remaining limitations.
