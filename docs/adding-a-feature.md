# Adding a feature end to end

This is the path a change takes from a new API operation to a tested screen. Every step names the command that does the mechanical part and the check that tells you the step is finished. The example archives a savings goal.

## 0. Once per checkout

```powershell
just setup
just dev
```

`just setup` creates `.env` with a generated database password, installs frontend packages, .NET tools and the git hooks, writes `.local/api-debug.env` for the VS Code debugger and runs `just doctor`. `just dev` starts PostgreSQL, the API (its output stays in the same terminal) and Vite once the API answers `/health`. After creating the first administrator, `just seed <email>` fills that user with six months of demo data; `just db-reset` starts over with an empty database.

## 1. Backend slice

```powershell
just new-endpoint Goals ArchiveGoal post "goals/{id}/archive" --service
```

The recipe creates the slice folder `Endpoints/<Tag>/<Name>` with the request, response, validator, endpoint and summary, the route written as `ApiRoutes.Goals + "/{id}/archive"`, and an integration test skeleton in the tag's test folder and collection (`--collection=<Name>` for a tag that has no tests yet). `--service` declares `<Name>Async` on the tag's interface (name it with `--service=<IName>` when the tag has several), adds a placeholder to the service class and makes the endpoint call it; without it the endpoint answers a placeholder itself. `ScaffoldPlaceholderTests` fails until the summary text and the placeholder handler are replaced. For the `delete` verb it creates only the endpoint and the summary: the endpoint derives from `Common/DeleteEndpoint.cs`, which reads the id from the route, calls the `DeleteAsync` override and answers 204 or the problem, so the concrete class holds the route, the group and the one service call. Then:

1. Put the behaviour in the tag's service (`Endpoints/Goals/Services`), never in the endpoint, and declare each public method on its interface (`Endpoints/Goals/Interfaces/IGoalService`), which is what the endpoint injects, even when the service has one implementation; `LayeringTests` fails when an endpoint touches `AppDbContext`, and when a type reaches into another tag's `Services` folder: inject that tag's interface, or move a helper both tags need to `Common` or to the owning tag's `Shared` folder. An admin-only route goes into the list in `AdminRouteTests`.
2. Give every validation rule a published code. The shared rule extensions in `Common/Validation` set one for you; a new kind of failure needs a constant in `Common/Errors/ErrorCodes.cs`. `ValidatorErrorCodeTests` fails on a rule without a code. When a create and an update request share fields, the rules are written once: both request records implement `I<Entity>Input` from the feature's `Shared/` folder, the rules live in the abstract `<Entity>InputValidator<TRequest>` next to it, and the two concrete validators are empty subclasses that add only what differs. The mapper follows the same interface: a static class in the feature's `Mappers/` folder with `request.ToEntity()`, one `input.ApplyTo(entity)` on `I<Entity>Input` that `ToEntity` reuses, and `entity.ToResponse()`. The service calls them; it takes the request, validates it before `ApplyTo` touches the tracked entity, and returns `Result<TResponse>`, so the endpoint only sends what it gets back: `await Send.OkOrProblemAsync(await goalService.ArchiveAsync(req, ct), ct);`. A create declares `Description(d => d.ProducesCreated<GoalResponse>())` and answers `await Send.CreatedOrProblemAsync(await goalService.CreateAsync(req, ct), goal => goal.Id, ct);`, which points `Location` at the request path plus the id (the overload taking a location string is for a resource that lives elsewhere); an operation without a body answers `Send.NoContentOrProblemAsync`. The helpers live in `Common/ResultResponses.cs`; an endpoint never throws for an expected failure (see [Errors](api.md#errors)). Never derive from FastEndpoints' `Mapper`, `RequestMapper` or `ResponseMapper`; `LayeringTests` fails on it.
3. Reuse the shared service helpers in `Common/` instead of repeating their bodies: `FindOrNotFoundAsync`, `UpdateOrNotFoundAsync` and `DeleteOrNotFoundAsync` for the lookup that answers 404 (and `EntityLookup.NotFound(message)` for any other 404; `NotFoundTests` fails on a hand-built `ErrorCodes.ResourceNotFound`), `IReferenceGuard` for "does this account exist" and "is this category of the right type", `SoftDeleteAsync` (`Common/SoftDeleteUpdates.cs`) for a bulk soft delete through `ExecuteUpdateAsync` that also stamps `UpdatedAt`, `Common/Sharing` for a record a household can share (`IShareableInput`, `RequiresHouseholdWhenShared`, `ApplySharing`, `ISharingGuard` and one entry in `ShareableSet.All`), and `IPagedRequest` with `ToPageAsync` for a paged list.
4. Write the summary: what the operation does, when to call it, every response status. It becomes the API documentation and the JSDoc of the generated hook.
5. A model change needs a migration: `just migrate-add AddGoalArchive`. `Model_has_no_changes_without_a_migration` in `ModelMappingTests` fails when the model and the migrations disagree, without Docker in `just test-unit`, and `QueryFilterTests` fails for a new entity without an owner filter until it is listed as a global or a child type.
6. Turn the scaffolded test into real ones next to the others in `JxFinance.Tests/Integration/Goals`. Derive from `IntegrationTestBase` and use the folder's collection and fixture (`[Collection<NetWorthCollection>]`, `(NetWorthFixture fixture)`; the [backend tests](architecture/testing.md#backend-tests) list which folder runs in which), open the data through the builders in `Support/Seed.cs` rather than a hand-written POST body, take a household owner and partner with their clients from `CreateHouseholdPairAsync`, reach the database through `WithDbAsync` instead of a hand-made scope, and pass `TestContext.Current.CancellationToken` to every call that accepts one; the `xUnit1051` analyzer fails the build otherwise. A response shape that more than one test class needs belongs in `Support/Dtos.cs`.

Finished when `just test` passes, except for `OpenApi_document_matches_the_approved_contract`, which is expected to fail until the next step.

## 2. Contract and generated client

```powershell
just gen
```

This exports the OpenAPI document from the backend build into `frontend/openapi.json`, the single committed copy of the contract, and regenerates the React Query hooks, MSW handlers, zod schemas and the route list in [API routes](api-routes.md); notes on a route go under its area in [Route notes](api.md#route-notes). Review the diff of `frontend/openapi.json` first: it is the API change as a client sees it. Commit the contract and the generated folders together with the backend change; CI regenerates both and fails on any difference.

A new mutation must be listed in `src/api/invalidation.ts`, either with the query roots it makes stale or in `mutationsWithoutInvalidation`; `invalidation.test.ts` fails otherwise. A new error code needs an English and a Lithuanian text under `serverErrors` in `src/locales/*/common.json`; `server-error-codes.test.ts` fails otherwise.

## 3. Fixtures and handlers

Add a typed fixture to `src/storybook/fixtures/goals.ts` and a default handler to `src/storybook/handlers/goals.ts` built from the generated `get…MockHandler`. List the fixture in `fixtures.contract.test.ts` so it is parsed by the generated zod response schema; a fixture whose name ends in `Problem` is checked against the problem schema without a listing, and the test fails when a fixture export is neither checked nor listed as exempt.

## 4. Component, story, test

```powershell
just new-component goals goal-archive-dialog
```

The recipe creates the component, the stories `Default` (with a `play` function), `Empty`, `Loading` and `ServerError` on the shared handler sets, and a DOM test on `mockApi` and `renderInApp`; make each story show its state once the component reads data, and drop one only when the state cannot happen. There is no `index.ts` barrel, so import the component file itself (`@/features/<feature>/<name>/<name>`). Conventions that the linter and the tests enforce:

- Forms use `useServerForm` (or `useAppForm` when the submit needs `formApi`) with `form.FormShell`, `form.FormActions` (also the footer of a dialog without a form, with its buttons as children) and the field components in `src/components/form`, schemas come from the builders in `src/lib/validation.ts`, submission goes through `submitToServer` so API field errors land on their inputs, and the mutation spreads `silentMutation` from `src/lib/mutations.ts` (`useCreateGoal({ mutation: { ...silentMutation, onSuccess: onClose } })`) with its error in a `FormError`. A long form splits into `FormSection`s, a record a household can share adds `SharingFields` (it hides itself without households) and sends `sharingPayload(value)`, and a file picker is `FileInput`, with `variant="button"` where a drop zone does not fit.
- Lists and tables reuse the shared pieces instead of copying them: `useConfirmedDelete` with `ConfirmDeleteDialog` for deletes (wrap a delete whose route names a parent, such as `DELETE /households/{id}/members/{userId}`, in `childDelete` from the same file), `useEditableList` from `src/hooks/use-editable-list.ts` for a page that lists records, edits one in an `EditModal` and deletes with a confirmation (it returns the deferred `list`, `rowProps(item)`, `editProps` and `dialogProps`), `usePagedList` and `usePageClamp` for paged sections, `useSearchTable` for URL-driven sorting and filters, `CreateDialog` (with its `icon` and `secondary` props) for a button that opens a form, `EditModal` or `Modal` (controlled by `open` and `onOpenChange`) for other dialogs, `PanelRows` and `PanelRowsSkeleton` for a page's list of progress rows, `TransactionsLink` for a name that opens its transactions, `SignedAmount` for a net or a change, `EmptyText` and `TableEmptyRow` for empty lists and tables, `Table` with `label` (and `columns` for a wide table) instead of a hand-built scroll wrapper, `RuledLine` for a status line between two rules, `namedOptions` and `nameById` from `src/lib/options.ts` for selects, and the date and number hooks in `src/hooks/use-formatters.ts` instead of a local `Intl` formatter.
- Text comes from `t("…")`. Keys are typed from `src/locales/en/common.json`, so a misspelt key is a compile error, and `locales.test.ts` fails when English and Lithuanian keys or placeholders differ.
- Stories cover the states a reviewer needs to see: default, empty, loading (`pending`), server error (`failWith`), and an interaction written as a `play` function. Every story runs as a Vitest test in jsdom (`just test-stories`) together with an axe scan, so a `play` function is an assertion, not a demo. jsdom has no CSS and no layout: assert on roles, names, text and state, and give a story whose assertion truly needs geometry `tags: ["browser-only"]`, which keeps it out of the run and in Storybook. Colour contrast is not measured by the run; look at a new surface in Storybook's Accessibility panel in both themes.
- A page route gets a `loader` that warms its queries through `warm` in `src/lib/route-prefetch.ts`.

## 5. Checks

| Command | What it runs | When |
| --- | --- | --- |
| `just test-fe <path>`, `just test-class <Name>`, `just test-method <Name>` | the frontend tests of one file or folder; one backend test class or method | while editing |
| `just check-changed` | lint, format and type checks and the tests in the folder of the changed frontend files, backend format and unit tests, docs links, each only when its area changed | before a commit |
| `just check-fast` | backend format, build and unit tests, frontend types, lint, format, unit and DOM tests | before a push; no Docker needed |
| `just test-stories` | every story's `play` function and an axe scan, in jsdom, about three minutes | after touching components, stories, fixtures or handlers |
| `just e2e` | the smoke tests and the user-flow specs against a throwaway Docker stack on port 8089 | after touching auth, routing, startup, Docker files or a flow that a spec in `frontend/e2e` covers |
| `just check` | everything CI runs except the end-to-end tests, story tests included | before pushing |

The git hooks cover the rest: a commit formats staged files (frontend and C#), lints the frontend ones and checks the commit subject is a conventional commit; a push type-checks the frontend and builds the backend, without running tests.

## 6. Commit

One commit carries the backend change, `frontend/openapi.json`, the generated client and the frontend change, with a conventional subject such as `feat(goals): archive a finished goal`. Behaviour that a future reader could not infer from the code goes in the matching page under [architecture](architecture/README.md); a choice between real alternatives goes in the Log of the topic's page under [decisions](decisions/README.md). Update the feature page under [features](features/README.md) when behaviour changes and, for a new feature, add its row to the walkthrough table, the one place its folders are named. `just check-docs` fails on a broken link and on a backticked path or type name the code no longer has.
