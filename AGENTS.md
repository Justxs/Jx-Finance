# AGENTS.md

Jx Finance is a self-hosted household ledger: a React 19 + TypeScript SPA (`frontend/`), an ASP.NET Core 10 API on FastEndpoints and EF Core (`backend/`), and PostgreSQL 16, shipped with Docker Compose. It never connects to a bank or moves money. One developer owns the project and it is not released yet.

## Read first

Documentation lives in [`docs/`](docs/README.md) and describes the current code. Read only what the task needs:

| Task | Read |
| --- | --- |
| Change or fix a feature | `docs/features/<feature>.md`, then `docs/decisions/<topic>.md` before changing behaviour it covers |
| Add a feature or endpoint | [docs/adding-a-feature.md](docs/adding-a-feature.md) |
| Understand a mechanism (auth, jobs, sharing, currency, contract) | `docs/architecture/<area>.md`, indexed in [docs/architecture/README.md](docs/architecture/README.md) |
| Touch the UI | [DESIGN.md](DESIGN.md), [PRODUCT.md](PRODUCT.md), [docs/architecture/visual-system.md](docs/architecture/visual-system.md) |
| Touch an endpoint, route or error | [docs/api.md](docs/api.md), [docs/architecture/api-contract.md](docs/architecture/api-contract.md) |
| Touch entities or migrations | [docs/data-model.md](docs/data-model.md) |
| Write tests or stories | [docs/architecture/testing.md](docs/architecture/testing.md) |

The feature table in [docs/features/README.md](docs/features/README.md) maps every feature to its backend folder, frontend folder and feature switch.

## Layout

- `backend/JxFinance.Api/Endpoints/<Tag>/<Operation>/`: one FastEndpoints slice per operation (endpoint, request, response, validator, summary); behaviour lives in `Endpoints/<Tag>/Services`.
- `backend/JxFinance.Api/{Domain,Infrastructure,Common,Extensions}`: framework-free domain types; EF, jobs and integrations; shared helpers, errors and validation.
- `backend/JxFinance.Tests/{Architecture,Integration,Unit,Support}`: xUnit v3; integration tests run against real PostgreSQL via Testcontainers.
- `frontend/src/{features,components,components/ui,routes,lib,stores,locales,storybook}`: one folder per component, holding its story; `locales/en` and `locales/lt` must match.
- Generated, never edited by hand: `frontend/openapi.json`, `frontend/src/api/generated/`, `frontend/src/api/schemas/`, `frontend/src/route-tree.gen.ts`, `backend/JxFinance.Api/Infrastructure/Data/Migrations/`.
- `scripts/`: Node and PowerShell helpers behind the `justfile` recipes.
- `tools/jx-mcp/`: the read-only MCP server, a separate Node package with its own `package.json`, tests (`nub run test`) and build, outside the frontend build and lint.

## Commands

The development machine is Windows with Windows PowerShell 5.1 (`powershell.exe`; `pwsh` is not installed). `just` runs its recipes in PowerShell. Run `nub` only from PowerShell: it fails in Git Bash. `node`, `git` and `dotnet` work in either shell.

| Command | Does |
| --- | --- |
| `just setup`, `just dev` | First checkout; run PostgreSQL, API and Vite together |
| `just check-fast` | Docs links, backend format and build, frontend types, lint, format and unit tests; no Docker |
| `just test` | Backend tests; needs Docker |
| `just test-stories` | Every story's `play` function plus an axe scan, in jsdom; about three minutes |
| `just check` | Everything CI runs except end-to-end tests |
| `just gen` | After an API change: export the contract and regenerate the client, MSW handlers and zod schemas |
| `just migrate-add <Name>` | Create an EF migration after a model change |
| `just new-endpoint <Tag> <Name> <verb> "<route>"`, `just new-component <feature> <name>` | Scaffold a backend slice or a frontend component with story and test |
| `just fix` | Auto-fix lint and formatting on both sides |
| `just check-docs` | Check every Markdown link and heading anchor |

Put a wall-clock timeout on long commands. Never start Storybook browser test runs (Vitest browser mode or Playwright over stories): they crashed and hung before. Playwright is only for `frontend/e2e` through `just e2e`.

## Code rules

General:

- No code comments of any kind, in C#, TypeScript, YAML, JSON or PowerShell. Use clear names and small functions; put any explanation in `docs/`.
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

A change is not finished until the docs match the code:

- Feature behaviour goes in `docs/features/<feature>.md`. A new feature gets a page plus a row in `docs/features/README.md`.
- A mechanism a reader could not infer from the code goes in the matching `docs/architecture/<area>.md`.
- A choice between real alternatives gets a dated entry at the top of the Log in `docs/decisions/<topic>.md`, with what was rejected and why. Update that page's Current section when the standing decision changes.
- New doc files use lowercase kebab-case names without numbers or spaces. Link with relative paths and run `just check-docs`.
- Keep lines under 2000 characters (some agent tools cut longer ones off); break long paragraphs at a sentence.

## Git

- Commit only when asked, directly on `master`; no feature branches.
- Subjects are conventional commits, such as `feat(goals): archive a finished goal`, with types `feat fix refactor perf test docs build ci chore style revert`; a hook enforces this.
- One commit carries a whole change: backend, contract, generated client, frontend and docs.
- The pre-commit hook formats staged files and checks docs links; the pre-push hook type-checks, runs related tests and builds the backend. Never skip hooks.
