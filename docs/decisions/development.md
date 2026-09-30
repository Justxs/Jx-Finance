# Development and testing: decisions

Related: architecture [API contract and generated client](../architecture/api-contract.md), [Frontend tests and Storybook](../architecture/testing.md), [Developer tooling and package updates](../architecture/developer-tooling.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-10-01.** The Storybook preview pins the clock to noon UTC on `FIXTURE_TODAY` (`pinClockToFixtureToday` in `src/storybook/clock.ts`), with time still running from there, so Storybook and the story runner see the same day as the fixtures
  - Rejected: Moving each story's expectation to the new month; Vitest fake timers in the story runner only; a frozen clock such as `mockdate`
  - Why: Stories read the real date while the fixtures are pinned to September 2026, so seven stories failed when the machine date reached October 1; editing expectations would break again every month. Fake timers exist only under Vitest and would leave Storybook showing a different month from the fixtures, and a clock that never moves can starve code that measures elapsed time, such as throttling and toasts
- **2026-09-30.** A form built from query data owns its mutation, has no remount `key`, and calls `formApi.reset(value)` after a successful save; TanStack Form applies changed `defaultValues` to untouched fields by itself
  - Rejected: The page owning the mutation and passing `pending`, `onSubmit(values, onSaved)` and a `key={JSON.stringify(data)}` down; a `key` on the query's `dataUpdatedAt`
  - Why: The pass-through props duplicated the request mapping in two files and the JSON key had to list the fields by hand. `dataUpdatedAt` changes on every refetch, including the window-focus one, so it would remount the form and discard unsaved edits whenever the administrator came back to the tab

- **2026-09-29.** Mutation meta helpers are plain objects spread into the generated hook's options: `{ mutation: { ...silentMutation, onSuccess } }` and `{ mutation: notify(message) }`; `silent(options)` is gone. List pages that edit in an `EditModal` and delete with a confirmation share `useEditableList`, and a delete whose route names a parent goes through `childDelete`
  - Rejected: Keeping `silent(options)` as a generic wrapper; leaving the editing state, deferred list and confirmed delete in each page
  - Why: The wrapper sat between the generated hook and the callback, so TypeScript could not infer the callback's argument and call sites wrote the response type by hand; six pages and four child-record deletes repeated the same wiring line for line
- **2026-09-29.** Shared frontend code (`src/components`, `src/lib`, `src/hooks`, `src/stores`) may not import `@/features/...`, enforced by a `no-restricted-imports` pattern; feature folders have no `index.ts` barrels, and cross-folder imports use `@/` paths instead of `../`. The React hook ban now also covers `src/components/ui`, whose files import React types by name instead of `import * as React`.
  - Rejected: Leaving the layering to review; keeping per-folder barrels in features; moving `NotificationBell` into a notifications feature
  - Why: Pieces used by several features had drifted into feature folders and pulled features into shared code; barrels hid which module a symbol came from and mixed three import styles; the bell is app-shell chrome rendered by the sidebar and the phone header, so as a feature it would have made those components import a feature
- **2026-09-20.** Stories run in jsdom as portable stories (Vitest project `stories`: `composeStories` with the real preview, MSW `setupServer`, `axe-core`), and Storybook is for manual review, where colour contrast is checked by eye in the Accessibility panel. This supersedes the 2026-09-19 row "Stories run as browser tests"
  - Rejected: Keeping the browser-mode story tests; splitting the browser run into shards
  - Why: The browser run of about 1,126 stories kept twelve renderers of about 940 MB each, roughly 10 GB, which crashed the page, once hung for eight hours, hit recurring 15 second cold-start timeouts and took about ten minutes when it did finish; shards would have kept the same renderers and the same cold starts. In jsdom the run takes about three minutes, one story needs real layout and is tagged `browser-only`, and the price is that contrast and anything else that needs paint is no longer gated
- **2026-09-19.** OpenAPI and Scalar routes exist only in Development, with `App:ApiDocs=true` as an explicit override used by the integration tests
  - Rejected: Serving them everywhere; running the tests in the Development environment
  - Why: A deployed installation should not describe its API to anyone who reaches it; Development in tests would also switch on the dev user seeding
- **2026-09-19.** `DevDataSeeder.SeedAsync` runs only in Development; first-run setup creates the administrator and its starter categories itself
  - Rejected: Seeding the passwordless `dev@localhost` user everywhere and letting setup take it over
  - Why: Production held a placeholder account until setup ran; setup already handled an empty user table, it only lacked the starter categories
- **2026-09-19.** One committed API contract, `frontend/openapi.json`, compared semantically by the backend test
  - Rejected: A second snapshot under the test project refreshed with `JX_UPDATE_SNAPSHOTS=1`
  - Why: Two files described one contract and an API change needed two commands; now `just gen` is the only step and the contract diff is reviewed where the client is generated
- **2026-09-19.** Superseded on 2026-09-20, see the 2026-09-20 entry above. Stories run as browser tests (Vitest browser mode, Playwright)
  - Rejected: Building Storybook only; portable stories in jsdom
  - Why: 28 of 957 stories were already broken without anyone noticing; jsdom cannot run the MSW service worker or real layout
- **2026-09-19.** End-to-end smoke tests run against a separate Compose project with its own volumes
  - Rejected: Running them against the dev stack
  - Why: First-run setup needs an empty database, and a test must never write to real data
- **2026-09-19.** Warnings are errors and analyzers run at `latest-recommended`; a short list of rules is switched off in `.editorconfig`
  - Rejected: Keeping compiler defaults
  - Why: Unused usings and culture-sensitive formatting were accumulating; the disabled rules (logging delegates, reserved-word namespaces, static members on generic types) do not pay for themselves here
- **2026-09-19.** Central package versions in `Directory.Packages.props`
  - Rejected: Versions per project
  - Why: The API and test project must agree on shared packages, and the update workflow edits one file
- **2026-09-19.** Demo data is a host command (`--seed-demo <email>`) for an existing empty user
  - Rejected: Seeding on startup in Development; a script calling the HTTP API
  - Why: Startup seeding surprises, and a script would need the user's password
