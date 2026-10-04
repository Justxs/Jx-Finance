# AGENTS.md

Jx Finance is a self-hosted household ledger: a React 19 + TypeScript SPA (`frontend/`), an ASP.NET Core 10 API on FastEndpoints and EF Core (`backend/`), and PostgreSQL 16, shipped with Docker Compose. It never connects to a bank or moves money. One developer owns the project and it is not released yet.

## Read first

Documentation lives in [`docs/`](docs/README.md) and describes the current code. Read only what the task needs:

| Task | Read |
| --- | --- |
| Change or fix a feature | `docs/features/<feature>.md`, then `docs/decisions/<topic>.md` before changing behaviour it covers |
| Add a feature or endpoint | [docs/adding-a-feature.md](docs/adding-a-feature.md) |
| Understand a mechanism (auth, jobs, sharing, currency, contract) | `docs/architecture/<area>.md`, indexed in [docs/architecture/README.md](docs/architecture/README.md) |
| Touch the UI | The [Components](DESIGN.md#components) entry you change and [Do's and Don'ts](DESIGN.md#dos-and-donts) in DESIGN.md; the matching section of [docs/architecture/visual-system.md](docs/architecture/visual-system.md); [PRODUCT.md](PRODUCT.md) for a new screen or new copy |
| Touch an endpoint, route or error | [How endpoints are written](docs/api.md#how-endpoints-are-written), [Errors](docs/api.md#errors) and the area's section of [Route notes](docs/api.md#route-notes); [docs/api-routes.md](docs/api-routes.md) to find a route; [Error codes](docs/architecture/api-contract.md#error-codes) for a new code |
| Touch entities or migrations | The entity's section of [docs/data-model.md](docs/data-model.md) and [Model configuration and migrations](docs/data-model.md#model-configuration-and-migrations) |
| Write tests or stories | [Backend tests](docs/architecture/testing.md#backend-tests), or the section of [Frontend tests](docs/architecture/testing.md#frontend-tests) that fits (story runner, unit and DOM tests, helpers, end-to-end) |

The feature table in [docs/features/README.md](docs/features/README.md) maps every feature to its backend folder, frontend folder and feature switch. Pages are split into headed sections, none longer than about 4,000 tokens: list a page's headings with `grep -n "^#"` and read only the section you need.

## Layout

- `backend/JxFinance.Api/Endpoints/<Tag>/<Operation>/`: one FastEndpoints slice per operation (endpoint, request, response, validator, summary); behaviour lives in `Endpoints/<Tag>/Services`.
- `backend/JxFinance.Api/{Domain,Infrastructure,Common,Extensions}`: framework-free domain types; EF, jobs and integrations; shared helpers, errors and validation.
- `backend/JxFinance.Tests/{Architecture,Integration,Unit,Support}`: xUnit v3; integration tests run against real PostgreSQL via Testcontainers.
- `frontend/src/{features,components,components/ui,routes,lib,stores,locales,storybook}`: one folder per component, holding its story; `locales/en` and `locales/lt` must match.
- Generated, never edited by hand: `frontend/openapi.json`, `frontend/src/api/generated/`, `frontend/src/api/schemas/`, `frontend/src/route-tree.gen.ts`, `backend/JxFinance.Api/Infrastructure/Data/Migrations/` and `docs/api-routes.md`.
- `scripts/`: Node and PowerShell helpers behind the `justfile` recipes.

## Commands

The development machine is Windows with Windows PowerShell 5.1 (`powershell.exe`; `pwsh` is not installed). `just` runs its recipes in PowerShell. Run `nub` only from PowerShell: it fails in Git Bash. `node`, `git` and `dotnet` work in either shell.

| Command | Does |
| --- | --- |
| `just setup`, `just dev` | First checkout; run PostgreSQL, API and Vite together |
| `just check-changed` | Lint, format and type checks, the frontend tests beside the changed files, backend format plus `test-unit`, and docs checks for only the areas changed against HEAD |
| `just check-fast` | Docs links, backend format, build and unit tests, frontend types, lint, format and unit tests; no Docker |
| `just test` | Backend tests; needs Docker; about two and a half minutes |
| `just test-unit`, `just test-class <Name>`, `just test-method <Name>` | Backend unit and architecture tests without Docker; one backend test class; one test method |
| `just test-fe <path>` | Frontend unit and DOM tests of one file or folder, relative to `frontend` |
| `just test-stories` | Every story's `play` function plus an axe scan, in jsdom; about three minutes |
| `just check` | Everything CI runs except end-to-end tests |
| `just gen` | After an API change: export the contract and regenerate the client, MSW handlers, zod schemas and the route list in `docs/api-routes.md` |
| `just migrate-add <Name>` | Create an EF migration after a model change, from a clean Release build; refuses an empty one |
| `just new-endpoint <Tag> <Name> <verb> "<route>" [--service]`, `just new-component <feature> <name>` | Scaffold a backend slice with its integration test (`--service` adds and calls the service method), or a frontend component with its stories and DOM test |
| `just fix` | Auto-fix lint and formatting on both sides |
| `just check-docs` | Check every Markdown link and heading anchor, code paths and type names in `docs/` and this file, sections too long to read whole, the `docs/api-routes.md` route list, and DESIGN.md against the code |
| `just diagrams` | Render the PlantUML system diagrams in `docs/architecture/diagrams` to SVG; needs Java |

Put a wall-clock timeout on long commands. Never start Storybook browser test runs (Vitest browser mode or Playwright over stories): they crashed and hung before. Playwright is only for `frontend/e2e` through `just e2e`.

## Seeing a change

- A component or page: open its story in the browser pane through the `storybook` entry of `.claude/launch.json` (port 6006, or `storybook-alt` on 6016 when the owner's Storybook holds 6006) and look at it in both themes. Its `play` functions run in `just test-stories`.
- The running app needs the development database, which runs in Docker. Never start Docker or `docker compose` yourself and never run Docker-backed tests in the foreground: run `just test-class` on integration tests only in the background with a hard timeout. When the owner has `just dev` running, open `http://localhost:5173` and ask them for a demo account (`just seed <email>` fills one).

## Traps

- `nub` fails in Git Bash; run it, and `just`, from PowerShell.
- Never write files with `Set-Content` or `Out-File`: they add a BOM and CRLF. The hook in `.claude/settings.json` refuses them, and `nub` in Git Bash.
- `just gen` binds a free port, so it works while `just dev` runs.
- `just migrate-add` builds with `--no-incremental`, strips EF's BOM and CRLF, and removes and fails on a migration with empty `Up` and `Down`.
- Incremental builds in this OneDrive folder can go stale; when a result looks wrong, rebuild with `--no-incremental`.
- The pre-commit format jobs re-stage the files they fix; lefthook hides unstaged hunks meanwhile and stops the commit if a fix conflicts with one. Staging whole files avoids that.
- Pick the narrowest check: `just test-fe <path>`, `just test-class` or `just test-method` while editing; `just check-changed` before a commit; `just check-fast` before a push; `just test` after backend changes that touch the database.

## Code rules

General:

- No code comments of any kind, in C#, TypeScript, YAML, JSON or PowerShell. Use clear names and small functions; put any explanation in `docs/`. The frontend lint rule `jx-code/no-comments` and `just format-check-backend` fail on one.
- Write the least code that meets the need. Reuse existing components, helpers and response types before adding new ones. Avoid one-use abstractions and branches for impossible cases.
- Never use deprecated APIs; use the replacement the deprecation names. The frontend lint enforces `typescript/no-deprecated`.
- Use the newest package versions, and do major-version migrations properly rather than pinning an old major.
- Never rewrite files with PowerShell `Set-Content` or `Out-File`, which add a BOM and CRLF. Files are UTF-8 with LF line endings.

Frontend:

- Prefer `function foo() {}` declarations over `const foo = () => {}`; inline callbacks may stay arrows.
- No `useMemo`, `useCallback` or `useEffect`: the React Compiler memoizes. Move side effects into event handlers or store actions.
- Style with Tailwind utilities only; hand-written CSS only where Tailwind cannot express it (keyframes, view-transition pseudo-elements).
- Keyboard shortcuts use TanStack Hotkeys, with global ones in `src/lib/shortcuts.ts`. Debouncing uses TanStack Pacer. No raw `keydown` listeners or `setTimeout` debounce.
- Persist per-browser state in TanStack DB local-storage collections, never raw `localStorage`.
- Forms, tables, dialogs, text, stories and cache invalidation follow step 4 of [docs/adding-a-feature.md](docs/adding-a-feature.md), and tests enforce most of it.

Backend:

- Endpoints stay thin and never touch `AppDbContext`; services do the work. Architecture tests enforce the layering.
- Every feature service keeps its interface in `Endpoints/<Tag>/Interfaces`, even with a single implementation; endpoints, jobs and other services inject the interface. Do not remove these interfaces as a simplification.
- Every validation rule has a published error code (`Common/Errors/ErrorCodes.cs`), and every new code gets English and Lithuanian text in `frontend/src/locales/*/common.json`.
- After an API change run `just gen` and commit the contract with the generated code. After a model change run `just migrate-add`.

## Keeping docs current

Docs describe behaviour, not code layout, so a change is finished when they match what the code does:

- Update docs when behaviour changes, not when code is renamed, moved or split. Feature behaviour goes in `docs/features/<feature>.md`; a new feature gets a page plus a row in `docs/features/README.md`, the one place that names a feature's folders.
- Name a class, file or method only when it is the entry point a reader needs. `just check-docs` fails on a backticked path or type name the code no longer has.
- A mechanism a reader could not infer from the code goes in the matching `docs/architecture/<area>.md`.
- A choice between real alternatives gets a dated entry at the top of the Log in `docs/decisions/<topic>.md`, with what was rejected and why. Update that page's Current section when the standing decision changes. Each Log keeps its newest 10 entries; older ones live in git history.
- New doc files use lowercase kebab-case names without numbers or spaces. Link with relative paths and run `just check-docs`.
- Keep lines under 2000 characters (some agent tools cut longer ones off); break long paragraphs at a sentence.

## Git

- Commit only when asked, directly on `master`; no feature branches, and no agents in worktree isolation.
- No `Co-Authored-By` or other attribution trailers in commit messages, even when a tool suggests one.
- Subjects are conventional commits, such as `feat(goals): archive a finished goal`, with types `feat fix refactor perf test docs build ci chore style revert`; a hook enforces this.
- One commit carries a whole change: backend, contract, generated client, frontend and docs.
- The pre-commit hook formats staged files and checks docs links; the pre-push hook type-checks the frontend and builds the backend, and runs no tests. Never skip hooks.
