# API surface

Generated from endpoint route declarations on 2026-09-05. The running OpenAPI document is the authoritative request/response schema; regenerate the frontend client after contract changes.

All routes require authentication except first-run setup/status and login, plus public diagnostics where explicitly configured. User administration requires the Admin role. Household permissions are checked in its service.

Money values are strings. Date-only values use YYYY-MM-DD. Collection paging uses page/pageSize and items/page/pageSize/total.

Every route accepts the optional request header `X-Active-Household`, a household id. It is not part of any request body and does not appear in the OpenAPI document; the client adds it to every call from the browser preference behind the household switcher. `ActiveHouseholdMiddleware` runs after authentication and the feature gate, accepts the value only when it parses and names a household the caller is a member of, and otherwise drops it silently: a bad or unknown value is read as "everything", never as an error and never as access. While the header is accepted, every response is narrowed to that household plus the caller's own personal records, which also means an account of another household is no longer a valid reference for a create or an update and answers `reference.notFound`. `GET /api/households` is deliberately not narrowed.

The three file downloads — `GET /api/transactions/export`, `GET /api/transactions/export/pdf` and `GET /api/investments/tax-summary/export` — accept the same value as an `activeHousehold` query parameter as well, because a CSV is fetched by the browser from a plain link that carries no headers. The same middleware reads it, on those three paths only, and applies the same membership check, so it can only narrow. A request that sends the header and the parameter must send the same household in both (letter case aside); two different households answer 400 `household.scopeMismatch`. The parameter is not in the OpenAPI document either, and an export URL carries no other identifier of the caller.

A fourth download, `GET /api/users/me/export`, the [data export per user](features/data-export-per-user.md), is a plain link too but answers the caller's own records whatever the scope: it reads no `activeHousehold` parameter and ignores `X-Active-Household`. It streams a zip without `Content-Length`, is throttled to three an hour per client and answers 409 `conflict.busy` while another export of the same member runs. A personal API token cannot reach it. `POST /api/users/me/import` takes that zip as `file` and loads it into the caller when they own no accounts or tags (400 `import.targetNotEmpty` otherwise), answers `tables`, `rows`, `attachments` and `removed`, and answers 409 `import.alreadyPresent` when the records already exist.

## Authorization header

A script reads the API with a [personal API token](features/personal-api-tokens.md) instead of the session cookie: `Authorization: Bearer jxp_<prefix>_<secret>`, while the `ApiTokens` feature is on. The token reaches only the operations whose OpenAPI entry lists the `PersonalApiToken` security scheme beside `Cookie`, plus `GET /api/ping`: every token the `GET` ones, and since 2026-10-01 a read-and-write token also the nine writes of transactions, transfers and recurring confirmations and the progress of a manual goal. Anything else answers 403 `token.notAllowed`, a malformed, unknown, expired or revoked token answers 401 `token.invalid` with `WWW-Authenticate: Bearer error="invalid_token"`, the feature switched off answers 404 `feature.disabled`, and more than 60 requests a minute with one token answer 429 `token.rateLimited` with `Retry-After`. A request that carries a token is authenticated by the token alone; its cookies are ignored. `X-Active-Household` and the `activeHousehold` query parameter of the three downloads narrow a token's answers exactly as they narrow the browser's. A token `POST` or `PATCH` may carry `Idempotency-Key`, 1 to 64 visible ASCII characters: repeated within 24 hours with the same method, path, query, `X-Active-Household` and body, it answers the first answer again with `Idempotency-Replayed: true`; with a different request it answers 409 `idempotency.keyReused`, while the first still runs 409 `conflict.busy`, and a malformed key 400 `text.tooLong` or `text.invalidFormat`. The browser never sends it and the header is not in the OpenAPI document, which would otherwise add it to every generated hook. Examples for curl, PowerShell, Python, Excel Power Query, an iOS Shortcut and Home Assistant are on the feature page.

## How endpoints are written

A feature folder is laid out by role, and namespaces mirror the folders:

```
Endpoints/Accounts/
  AccountsGroup.cs              route prefix, OpenAPI tag, shared error responses
  Interfaces/                   IAccountService
  Services/                     AccountService
  Mappers/                      AccountMapper
  Shared/                       AccountResponse, Iban — anything two operations need
  CreateAccount/                endpoint, request, validator, summary
  GetAccount/  GetAccounts/  UpdateAccount/  DeleteAccount/
  GetArchivedAccounts/  RestoreAccount/
```

Everything specific to one operation stays in that operation's folder; the moment a second operation needs it, it belongs in `Shared/`. Features without a mapper (Dashboard, Reports, Imports, Ping, Users) simply have no `Mappers/` folder.

Every endpoint is a FastEndpoints class under `Endpoints/<Feature>/<Operation>/`, alongside its request DTO, its FluentValidation validator, and its documentation class. Endpoints hold no data access; they call a feature service and translate its result. Create and update requests that share fields implement one `I<Entity>Input` interface in the feature's `Shared/` folder, and their validators derive from the abstract `<Entity>InputValidator<TRequest>` beside it, so a rule is written once; the request records stay separate types, which keeps the schema names in the contract. The delete endpoints derive from `Common/DeleteEndpoint.cs` and keep only their route, group and service call. Paged list requests implement `IPagedRequest`, and `ToPageAsync` in `Common/Paging.cs` clamps the page, caps the page size at 200, counts and slices. Texts that several summaries repeat come from `Common/OpenApi/SummaryText.cs`, with `DescribePaging()` and `DescribeTransactionFilter()` for the parameter blocks.

`Configure()` carries the contract:

- The route is declared relative to the feature's `Group`, and the group supplies the `api` prefix, the OpenAPI tag and the 400 response. Groups derive from `Common/ApiGroup.cs`; a group behind a feature switch passes its `Feature`, which gates every endpoint in it (see [Installation settings](architecture/installation-settings.md)). The global `Endpoints.Configurator` in `ApiPipelineExtensions` adds 500 to every endpoint, 401 unless the endpoint allows anonymous calls, and 403 when it requires a role, so a route cannot advertise a 401 it never returns or forget one; an anonymous endpoint that does answer 401, such as sign-in, declares it itself. A throttled endpoint declares its own 429, because FastEndpoints keeps the throttle internal. `EndpointContractTests` checks all of this, that every endpoint has a summary and a tag, and that no endpoint sends a bare 401, 403 or 404 without a problem body (refresh is the one exception: it clears the cookies and answers an empty 401).
- `Description()` declares status codes the framework cannot infer: the 201 returned by the create endpoints (always `d.ProducesCreated<TResponse>()` from `Common/CreatedDescription.cs`, which replaces the default 200 with a JSON 201), the 404 an owner-scoped lookup can return, the 429 from a throttled endpoint, and the file content types of the export endpoints.
- Cross-cutting settings sit next to the route: `AllowAnonymous()`, `Roles(AppRoles.Admin)`, `Throttle(...)`, `AllowFileUploads()`.

The prose documentation lives next door in `<Operation>Summary.cs`, a `Summary<TEndpoint, TRequest>` (or `Summary<TEndpoint>` where the endpoint takes no request) that FastEndpoints binds to the endpoint by type. It holds a one-line summary, a paragraph of behaviour worth knowing before calling, a description per route and query parameter, a description per status code, and an example request body. This is the only place endpoint documentation lives — Scalar and the generated client both read it out of the OpenAPI document.

Endpoints, validators and summaries are all discovered by the FastEndpoints source generator (`FastEndpoints.Generator`) rather than by assembly scanning, so registration and model binding are resolved at compile time. `AddFastEndpoints(DiscoveredTypes.All)` in `ApiServiceExtensions` is what selects that path, and `c.Binding.ReflectionCache.AddFromJxFinanceApi()` in `ApiPipelineExtensions` swaps the request-binding reflection for generated accessors.

The same generator owns dependency-injection registration. A service declares its own lifetime with `[RegisterService<IGoalService>(LifeTime.Scoped)]`, and `RegisterServicesFromJxFinanceApi()` wires them all up. Adding a service never touches `ApiServiceExtensions`; only registrations that depend on configuration (the exchange-rate provider, the background jobs) are still written there by hand.

## Mapping

Every feature follows one shape. The endpoint hands its request to the feature service and sends back what the service returns; the service takes request types, returns response types, and answers `Result<TResponse>` (or `Result`, or `Result<Guid>` for a delete) from every operation that can fail — lookups, creates, updates, confirmations. A list that cannot fail returns the plain `IReadOnlyList<TResponse>`. Entities never cross into an endpoint.

Translation between request DTOs, domain entities and response DTOs lives in one static class of extension methods per entity, under the feature's `Mappers/` folder — `AccountMapper`, `BudgetMapper`, `CategoryMapper`, `CategorizationRuleMapper`, `ConversionMapper`, `GoalMapper`, `HouseholdMapper`, `InvestmentMapper`, `AssetMapper`, `DebtMapper`, `NotificationMapper`, `RecurringBillMapper`, `TagMapper`, `TransactionMapper`, `TransferMapper`, `TrashMapper`. Only the service calls them. There are three names:

- `request.ToEntity(...)` builds a new entity from the create request.
- `input.ApplyTo(entity, ...)` writes the fields a create and an update share, taking the feature's `I<Entity>Input`; `ToEntity` builds the entity and calls it, so the assignments exist once. What only one side sets stays outside it: a category's type and a transaction's source on create, a recurring entry's `IsActive` on update.
- `entity.ToResponse(...)` builds the response.

A mapper holds no state and resolves nothing, so anything it needs arrives as an argument. The reporting currency is the common one: the service reads it (`rates.ReportingCurrency` or `IInstanceSettingsStore`) and passes it to `ToEntity` and `ApplyTo` for accounts, budgets, goals, assets and debts. Several responses carry values no entity holds — an account balance, a budget's window, spend and carry, a transaction's split lines and tag ids, a household's members, a goal's progress when it is funded from an account, a transfer's imported flags — so `ToResponse` takes the computed value as an argument and the service supplies it; there is no overload that builds such a response from the entity alone.

FastEndpoints' own `Mapper<TRequest, TResponse, TEntity>`, `RequestMapper` and `ResponseMapper`, and the mapper generic argument on `Endpoint<TRequest, TResponse, TMapper>`, are not used. `LayeringTests` fails when a type derives from one of them, and when a class in a `Mappers` namespace is not static.

### Validate before mutating

An update validates the request, not the tracked entity: the service loads the row, runs every check against the request (and the loaded row where the rule compares old and new), and only then calls `ApplyTo` and saves. A failed update therefore leaves the change tracker clean. Where a rule needs the value the entity would hold after the change, the mapper computes it from the input without touching the entity — `TagMapper.NormalizedName`, `GoalMapper.FundingAccount`, `SharingState.From(input)` — and `ISharingGuard.CheckAsync(existing, input)` compares the loaded row's sharing with the one the request asks for. Creates follow the same order: validate the request, then build the entity with `ToEntity`.

## OpenAPI document

`Extensions/OpenApiExtensions.cs` holds the document settings: title, version, tag descriptions, the access-token cookie security scheme, and the document-level description.

It also runs `SchemaVariants.Collapse` as a document transformer. Property-level descriptions and examples make ASP.NET Core's OpenAPI generator clone any `$ref`-ed schema that carries them, so a documented `AccountType` property emits `AccountType__op6EE6F961C867` rather than reusing `AccountType` — and the generated TypeScript client then carries those hashed names. The transformer points such properties back at the canonical schema and deletes the clones. A description that every clone of a schema agreed on (`"Weekly, Monthly, Quarterly, or Yearly."`) is promoted onto the canonical schema, so it survives; where endpoints described the same type differently the canonical schema keeps no description and the endpoint's own prose carries it.

## Notifications

`GET /api/notifications` is the one response whose meaning depends on a discriminator rather than on the route. Each row carries `type` (`billDue`, `budgetWarning`, `budgetExceeded`, `unusualAmount`, `unusualAmounts`, `recurringPriceRise`, `monthReadyToClose`, `monthlyDigest`, `lowBalance`, `warrantyExpiring`), a `title`, a plain-text `message` and a `payload` object whose properties are all optional: `dueDate` for a bill reminder, `thresholdPercent` and `period` for a budget alert, `transactionId`, `amount`, `typicalAmount`, `factor` and `currency` for an unusual expense, `count` for several at once, `billId`, `transactionId`, `amount` (charged), `typicalAmount` (expected) and `currency` for a price rise, `month` (the first day of the month, `YYYY-MM-DD`) for a month that is ready to close, and `month` with `digest` (`currency`, `income`, `expense`, `net`, `keptPercent`, `movers`, `uncategorized`, `unusual`, `unconfirmedRecurring`, `accountsNeedingAttention`, `closed`) for the [monthly digest](features/monthly-digest.md), and `dueDate` (the first day below zero), `amount` (the lowest balance) and `currency` for a [low-balance forecast](features/notifications.md#low-balance-alerts). `amount` and `typicalAmount` are decimal strings like every other money field, and `currency` is the currency they are in. The client branches on `type` and builds the sentence from the payload, so adding a kind is a new enum value and a new locale key, never a new endpoint. A payload it does not recognise falls back to `message`. The three notification routes are deliberately ungated — `NotificationsGroup` declares no feature: they belong to no single feature and must answer while any producer — or none — is switched on, and a row whose producing feature was switched off afterwards is still listed.

Four routes answer without a session, beside sign-in, refresh, setup and the public settings: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` and `POST /api/auth/verify-email`, because the person holding an emailed link is by definition not signed in, and they are listed in `AuthorizationTests` alongside the others. `forgot-password` answers 204 whatever the address is, so the screen reveals nothing; the three of them are throttled per client (5, 10 and 10 calls per five minutes) and none of them counts toward the account lockout. `POST /api/auth/send-verification-email` is the fourth and does need a session: it resends the link for the caller's own address. `GET /api/settings/public` gained `emailEnabled`, which is what lets the sign-in screen decide whether to offer "Forgot password"; it still carries no host name and no credential. Since 2026-09-29 it also carries `passkeysAvailable`, and `POST /api/auth/passkeys/sign-in-options` and `POST /api/auth/passkeys/sign-in` answer without a session too: they are the [passkey](features/passkeys.md) sign-in, throttled to 10 calls per five minutes per client, never counted toward the lockout, and listed in `AuthorizationTests`. The other passkey routes need a session and act on the caller's own passkeys only; the id in their path is the base64url credential id, not a GUID. The mail server itself lives under `/api/settings/smtp` and is administrators only, unlike `GET /api/settings`, and its response carries `hasPassword` rather than the password.

## Errors

Failures answer `application/problem+json` shaped by FastEndpoints' RFC 9457 `ProblemDetails`, configured once in `ApiPipelineExtensions.ConfigureFastEndpoints`. Validation failures, `AddError` followed by `Send.ErrorsAsync`, failed service results, the answers of `FeatureGateMiddleware` and `ActiveHouseholdMiddleware`, and unhandled exceptions all land in the same envelope:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "instance": "/api/accounts",
  "traceId": "0HMPNHL0JHL76:00000001",
  "errors": [{ "name": "name", "reason": "'Name' must not be empty.", "code": "validation" }]
}
```

`name` is the offending request property, or `generalErrors` for a failure that is not tied to one field. A nested property is a path with every segment in camel case, such as `depreciation.lifeMonths` or `lines[1].amount`; `ProblemResponses.Build` converts each segment. `code` is the machine-readable reason, and is what clients should branch on rather than the prose in `reason`.

Services return `Result<T>` with one of the codes in `Common/Errors/ErrorCodes.cs`. Endpoints hand it to one of the sender helpers in `Common/ResultResponses.cs`, which answer without throwing and map the code to a status through `ErrorCodes.StatusCodeFor`: `not_found` to 404, `conflict` to 409, `forbidden` to 403, `unauthorized` to 401, `credentials.lockedOut` and `token.rateLimited` to 429, `passkey.limitReached`, `token.limitReached` and `idempotency.keyReused` to 409, `token.invalid` to 401, `token.notAllowed` to 403, `receipt.engineUnavailable` to 503, anything else to 400. `feature.disabled` maps to 404 as well, so a service that answers it — today only a restore of a record whose feature is switched off — reads the same as the feature gate's own answer on a gated prefix. Nothing reaching for a resource it cannot see is told the difference between "missing" and "not yours": those cases return 404 on purpose.

| Helper | Success | Failure |
| --- | --- | --- |
| `Send.OkOrProblemAsync(result, ct)` | 200 with the value | problem |
| `Send.CreatedOrProblemAsync(result, value => location, ct)` | 201 with the value and `Location` | problem |
| `Send.NoContentOrProblemAsync(result, ct)` | 204 (for `Result` and `Result<T>`) | problem |
| `Send.CreatedAsync(location, value, ct)` | 201 for a create that cannot fail | |
| `Send.ProblemAsync(error, ct)` | | the problem for one `DomainError`, optionally with an explicit status |

A problem is one `GeneralErrors` failure carrying the error's code and message, written by FastEndpoints' own `Send.ErrorsAsync`, so it is byte for byte what the validation pipeline writes; `ResultResponsesTests` compares it with the response of a thrown `ThrowError`. An endpoint that needs the value before answering (sign-in, a download, a response built from the value) writes `if (!result.TryGetValue(out var value)) { await Send.ProblemAsync(result.Error, ct); return; }`. Nothing in an endpoint throws for an expected failure; file checks in upload endpoints call `AddError(r => r.File, ...)` and `Send.ErrorsAsync`, then return.

Middleware that refuses a request before an endpoint runs writes through `ProblemResponses.WriteAsync(context, error)`, which builds the same `generalErrors` failure (`ProblemResponses.FromDomainError`) and hands it to FastEndpoints' `SendErrorsAsync`, so the body is the one `Send.ProblemAsync` would write; `MiddlewareProblemTests` compares the two byte for byte. That covers 404 `feature.disabled` from the feature gate, 400 `household.scopeMismatch` from the active household check, and 401 `token.invalid`, 403 `token.notAllowed`, 404 `feature.disabled` and 429 `token.rateLimited` from the personal API token handler, gate and rate limiter, and 400 `text.tooLong` or `text.invalidFormat` and 409 `idempotency.keyReused` or `conflict.busy` from the idempotency middleware. An unhandled exception is answered by `UseExceptionHandler` with `ProblemResponses.WriteServerErrorAsync`: status 500, the title `An error occurred while processing your request.`, and an empty `errors` list, since there is no code to give. ASP.NET Core's own `AddProblemDetails` is not registered, so nothing writes the MVC problem shape. The problem schema therefore has no top-level `code`: a client reads the code from `errors[].code` only.

Every 201 goes through `CreatedAsync`, which sets `Location` to a path built from `ApiRoutes` (`$"{ApiRoutes.TagsPath}/{tag.Id}"`) and serializes the body with FastEndpoints' serializer like every other response. Nothing answers through ASP.NET's `TypedResults`/`Results` JSON writers, so the camel-case `JsonStringEnumConverter` is registered once, on the FastEndpoints serializer in `ApiPipelineExtensions`; the OpenAPI enum schemas do not depend on it.

## Routes

| Method | Route |
| --- | --- |
| GET | `/api/accounts` |
| POST | `/api/accounts` |
| GET | `/api/accounts/archived` |
| GET | `/api/accounts/forecast` |
| DELETE | `/api/accounts/{id}` |
| GET | `/api/accounts/{id}` |
| PUT | `/api/accounts/{id}` |
| GET | `/api/accounts/{id}/reconciliations` |
| POST | `/api/accounts/{id}/reconciliations` |
| GET | `/api/accounts/{id}/reconciliations/preview` |
| DELETE | `/api/accounts/{id}/reconciliations/{reconciliationId}` |
| POST | `/api/accounts/{id}/restore` |
| GET | `/api/assets` |
| POST | `/api/assets` |
| DELETE | `/api/assets/{id}` |
| PUT | `/api/assets/{id}` |
| GET | `/api/assets/{id}/valuations` |
| DELETE | `/api/assets/{id}/valuations/{date}` |
| PUT | `/api/assets/{id}/valuations/{date}` |
| GET | `/api/assets/{id}/value-history` |
| DELETE | `/api/attachments/{id}` |
| GET | `/api/attachments/{id}/content` |
| POST | `/api/auth/2fa/disable` |
| POST | `/api/auth/2fa/enable` |
| POST | `/api/auth/2fa/setup` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |
| GET | `/api/auth/passkeys` |
| POST | `/api/auth/passkeys` |
| DELETE | `/api/auth/passkeys/{id}` |
| PUT | `/api/auth/passkeys/{id}` |
| POST | `/api/auth/passkeys/registration-options` |
| POST | `/api/auth/passkeys/sign-in` |
| POST | `/api/auth/passkeys/sign-in-options` |
| POST | `/api/auth/refresh` |
| POST | `/api/auth/reset-password` |
| POST | `/api/auth/send-verification-email` |
| POST | `/api/auth/verify-email` |
| GET | `/api/auth/sessions` |
| POST | `/api/auth/sessions/revoke-others` |
| DELETE | `/api/auth/sessions/{id}` |
| GET | `/api/auth/tokens` |
| POST | `/api/auth/tokens` |
| DELETE | `/api/auth/tokens/{id}` |
| GET | `/api/backups` |
| POST | `/api/backups` |
| DELETE | `/api/backups/{id}` |
| PUT | `/api/backups/{id}` |
| GET | `/api/backups/{id}/download` |
| POST | `/api/backups/{id}/restore` |
| POST | `/api/backups/upload` |
| GET | `/api/budgets` |
| POST | `/api/budgets` |
| GET | `/api/budgets/suggestions` |
| DELETE | `/api/budgets/{id}` |
| PUT | `/api/budgets/{id}` |
| GET | `/api/categorization-rules` |
| POST | `/api/categorization-rules` |
| POST | `/api/categorization-rules/run` |
| POST | `/api/categorization-rules/run/preview` |
| GET | `/api/categorization-rules/suggested` |
| POST | `/api/categorization-rules/suggested/dismiss` |
| POST | `/api/categorization-rules/test` |
| DELETE | `/api/categorization-rules/{id}` |
| PUT | `/api/categorization-rules/{id}` |
| POST | `/api/categorization-rules/{id}/move` |
| GET | `/api/categories` |
| POST | `/api/categories` |
| DELETE | `/api/categories/{id}` |
| PUT | `/api/categories/{id}` |
| GET | `/api/contacts` |
| POST | `/api/contacts` |
| DELETE | `/api/contacts/payments/{id}` |
| POST | `/api/contacts/splits` |
| DELETE | `/api/contacts/splits/{id}` |
| PUT | `/api/contacts/splits/{id}` |
| DELETE | `/api/contacts/{id}` |
| PUT | `/api/contacts/{id}` |
| GET | `/api/contacts/{id}/entries` |
| POST | `/api/contacts/{id}/payments` |
| GET | `/api/conversions` |
| POST | `/api/conversions` |
| DELETE | `/api/conversions/{id}` |
| PUT | `/api/conversions/{id}` |
| GET | `/api/currencies` |
| GET | `/api/dashboard/category-breakdown` |
| GET | `/api/dashboard/monthly-trend` |
| GET | `/api/dashboard/summary` |
| GET | `/api/debts` |
| POST | `/api/debts` |
| DELETE | `/api/debts/{id}` |
| PUT | `/api/debts/{id}` |
| GET | `/api/debts/{id}/payment-candidates` |
| GET | `/api/debts/{id}/payments` |
| POST | `/api/debts/{id}/payments` |
| DELETE | `/api/debts/{id}/payments/{paymentId}` |
| PUT | `/api/debts/{id}/payments/{paymentId}` |
| GET | `/api/debts/{id}/schedule` |
| GET | `/api/exchange-rates` |
| GET | `/api/goals` |
| POST | `/api/goals` |
| DELETE | `/api/goals/{id}` |
| PUT | `/api/goals/{id}` |
| PATCH | `/api/goals/{id}/progress` |
| GET | `/api/households` |
| POST | `/api/households` |
| DELETE | `/api/households/{id}` |
| GET | `/api/households/{id}` |
| PUT | `/api/households/{id}` |
| GET | `/api/households/{id}/audit` |
| POST | `/api/households/{id}/members` |
| DELETE | `/api/households/{id}/members/{userId}` |
| PUT | `/api/households/{id}/members/{userId}` |
| GET | `/api/households/{id}/settle-up` |
| GET | `/api/households/{id}/settlements` |
| POST | `/api/households/{id}/settlements` |
| DELETE | `/api/households/{id}/settlements/{settlementId}` |
| GET | `/api/households/{id}/shared-expenses` |
| POST | `/api/households/{id}/shared-expenses` |
| DELETE | `/api/households/{id}/shared-expenses/{expenseId}` |
| PUT | `/api/households/{id}/shared-expenses/{expenseId}` |
| POST | `/api/import/confirm` |
| GET | `/api/import/csv-mappings` |
| POST | `/api/import/csv-mappings` |
| DELETE | `/api/import/csv-mappings/{id}` |
| PUT | `/api/import/csv-mappings/{id}` |
| POST | `/api/import/csv/inspect` |
| GET | `/api/import/inbox` |
| GET | `/api/import/inbox/status` |
| DELETE | `/api/import/inbox/{id}` |
| GET | `/api/import/inbox/{id}/file` |
| POST | `/api/import/preview` |
| GET | `/api/investments/allocation-targets` |
| PUT | `/api/investments/allocation-targets` |
| GET | `/api/investments/connections` |
| PUT | `/api/investments/connections/{accountId}` |
| DELETE | `/api/investments/connections/{accountId}` |
| POST | `/api/investments/connections/{accountId}/sync` |
| POST | `/api/investments/import/interactive-brokers` |
| GET | `/api/investments/portfolio` |
| GET | `/api/investments/tax-summary` |
| GET | `/api/investments/tax-summary/export` |
| GET | `/api/investments/securities` |
| POST | `/api/investments/securities` |
| PUT | `/api/investments/securities/{id}` (Admin) |
| PUT | `/api/investments/securities/{id}/price` |
| POST | `/api/investments/securities/{id}/price-symbol/find` (Admin) |
| GET | `/api/investments/securities/{id}/prices` |
| POST | `/api/investments/securities/{id}/prices/import` |
| DELETE | `/api/investments/securities/{id}/prices/{date}` |
| GET | `/api/investments/transactions` |
| POST | `/api/investments/transactions` |
| DELETE | `/api/investments/transactions/{id}` |
| PUT | `/api/investments/transactions/{id}` |
| GET | `/api/investments/value-history` |
| GET | `/api/month-close` |
| DELETE | `/api/month-close/{month}` |
| GET | `/api/month-close/{month}` |
| POST | `/api/month-close/{month}` |
| PUT | `/api/month-close/{month}/note` |
| GET | `/api/networth` |
| GET | `/api/networth/history` |
| GET | `/api/notifications` |
| POST | `/api/notifications/read-all` |
| PATCH | `/api/notifications/{id}/read` |
| GET | `/api/ping` |
| GET | `/api/receipts/item-categories` |
| DELETE | `/api/receipts/item-categories/{id}` |
| POST | `/api/receipts/read` |
| PUT | `/api/receipts/{id}/categories` |
| GET | `/api/recurring-bills` |
| POST | `/api/recurring-bills` |
| GET | `/api/recurring-bills/calendar` |
| DELETE | `/api/recurring-bills/{id}` |
| GET | `/api/recurring-bills/{id}` |
| PUT | `/api/recurring-bills/{id}` |
| POST | `/api/recurring-bills/{id}/confirm` |
| POST | `/api/recurring-bills/{id}/skip` |
| GET | `/api/recurring-bills/suggestions` |
| POST | `/api/recurring-bills/suggestions/dismiss` |
| GET | `/api/recurring-bills/totals` |
| GET | `/api/reports/summary` |
| GET | `/api/settings` |
| PUT | `/api/settings` |
| PUT | `/api/settings/discord` |
| GET | `/api/settings/exchange-rates` (Admin) |
| POST | `/api/settings/exchange-rates/sync` |
| DELETE | `/api/settings/exchange-rates/{currency}/{date}` (Admin) |
| PUT | `/api/settings/exchange-rates/{currency}/{date}` (Admin) |
| GET | `/api/settings/market-prices` (Admin) |
| PUT | `/api/settings/market-prices` (Admin) |
| POST | `/api/settings/market-prices/sync` (Admin) |
| GET | `/api/settings/public` |
| GET | `/api/settings/smtp` |
| PUT | `/api/settings/smtp` |
| POST | `/api/settings/smtp/test` |
| POST | `/api/setup` |
| GET | `/api/setup/status` |
| GET | `/api/tags` |
| POST | `/api/tags` |
| DELETE | `/api/tags/{id}` |
| PUT | `/api/tags/{id}` |
| GET | `/api/transaction-groups` |
| POST | `/api/transaction-groups` |
| DELETE | `/api/transaction-groups/{id}` |
| PUT | `/api/transaction-groups/{id}` |
| GET | `/api/transaction-groups/{id}/members` |
| POST | `/api/transaction-groups/{id}/members` |
| DELETE | `/api/transaction-groups/{id}/members/{transactionId}` |
| GET | `/api/transactions` |
| POST | `/api/transactions` |
| POST | `/api/transactions/bulk-account` |
| POST | `/api/transactions/bulk-category` |
| POST | `/api/transactions/bulk-delete` |
| POST | `/api/transactions/bulk-tags` |
| GET | `/api/transactions/export` |
| GET | `/api/transactions/export/pdf` |
| GET | `/api/transactions/ledger` |
| GET | `/api/transactions/places` |
| POST | `/api/transactions/places/rename` |
| POST | `/api/transactions/suggest-category` |
| GET | `/api/transactions/summary` |
| GET | `/api/transactions/uncategorized-suggestions` |
| DELETE | `/api/transactions/{id}` |
| GET | `/api/transactions/{id}` |
| PUT | `/api/transactions/{id}` |
| POST | `/api/transactions/{id}/duplicates/keep` |
| DELETE | `/api/transactions/{id}/unusual/dismiss` |
| POST | `/api/transactions/{id}/unusual/dismiss` |
| GET | `/api/transactions/{transactionId}/attachments` |
| POST | `/api/transactions/{transactionId}/attachments` |
| GET | `/api/transfers` |
| POST | `/api/transfers` |
| DELETE | `/api/transfers/{id}` |
| PUT | `/api/transfers/{id}` |
| GET | `/api/trash` |
| POST | `/api/trash/restore` |
| POST | `/api/trash/restore-transactions` |
| GET | `/api/users` |
| POST | `/api/users` |
| PUT | `/api/users/me` |
| DELETE | `/api/users/me/dashboard-layout` |
| GET | `/api/users/me/dashboard-layout` |
| PUT | `/api/users/me/dashboard-layout` |
| DELETE | `/api/users/me/discord` |
| GET | `/api/users/me/discord` |
| PUT | `/api/users/me/discord` |
| POST | `/api/users/me/discord/test` |
| PUT | `/api/users/me/email-notifications` |
| GET | `/api/users/me/export` |
| POST | `/api/users/me/import` |
| PUT | `/api/users/me/language` |
| POST | `/api/users/{id}/deactivate` |
| POST | `/api/users/{id}/reactivate` |
| POST | `/api/users/{id}/reset-password` |
| PUT | `/api/users/{id}/role` |

Import preview takes `format` (`swedbankCsv`, `camt053` or `genericCsv`) beside the file and account, and answers the rows with `isReversal`, `suggestedTransferAccountId` and `matchedTransaction` (`id`, `date`, `description`, `categoryId` of a hand-entered transaction the row can be linked to, or null) plus a `statement` summary (`iban`, `ibanMatchesAccount`, `otherAccountId`, `notBooked`, `unreadable`, `closingDate`, `closingBalance`, `closingCurrency`, `ledgerBalanceAtClose`); a camt.053 file with several statements and none for the account answers 400 `import.noStatementForAccount`, whose `reason` is the comma-separated IBANs the file holds. Import confirm takes the same `format`, and its rows optionally select TransferAccountId and ExistingTransferId, or ExistingTransactionId to link the bank entry to a hand-entered transaction instead of adding one; a link that no longer fits answers 400 `import.entryMismatch`, and the response counts `linked` beside `imported` and `skippedDuplicates`.
Since 2026-09-29 `genericCsv` reads any CSV through a saved column mapping: preview and confirm take `mappingId`, which is required for that format (`required` otherwise) and answers `reference.notFound` when the mapping is not the caller's; a file without a column the mapping names answers 400 `import.missingColumns`, whose `reason` lists the quoted names. `/api/import/csv-mappings` lists (by name), creates, replaces and deletes the caller's mappings (`name`, `encoding`, `delimiter`, `skipLines`, `amountStyle`, `dateFormat`, `decimalSeparator`, `currency`, `columns`); an amount style without its columns, or a status column without `bookedValues`, answers `import.mappingIncomplete`, a date format outside the list `import.invalidDateFormat`, and a deleted mapping goes to the trash as `csvImportMapping`. `POST /api/import/csv/inspect` (multipart `file`, optional `encoding`, `delimiter` and `skipLines`) answers the proposed `encoding`, `delimiter` and `skipLines`, the `columns` with the date formats and decimal separator each one's samples fit, up to ten `samples` rows of raw cells and the `matchingMappingIds` of the caller's mappings whose every named column is in the header. See [Bank statement import](features/bank-statement-import.md#generic-csv).

Since 2026-10-01 the import inbox has four routes under the `Import` switch. `GET /api/import/inbox` lists the caller's waiting statements, newest first (`id`, `fileName`, `format`, `accountId`, `mappingId`, `receivedAt`), leaving out any whose account the caller no longer sees; `GET /api/import/inbox/{id}/file` answers the stored bytes as `application/octet-stream`; `DELETE /api/import/inbox/{id}` removes one from the list and deletes its bytes, answering 204 or `resource.notFound`. `GET /api/import/inbox/status` is administrator-only and answers `directory` (null while `App:ImportInbox` is unset) and the latest 20 `failures` (`fileName` relative to `failed/`, `reason`, `at`). None of them is readable with a personal API token, like everything under `/api/import`. See [Bank statement import](features/bank-statement-import.md#import-inbox).
Since 2026-09-29 a preview row also carries `refundCandidate`, shaped like `matchedTransaction`: an earlier expense on the account the incoming row probably refunds, or null. A confirm row takes `asRefund` (false by default) and `refundOfTransactionId`: an incoming row sent with `asRefund` is written as a refund, an expense with the negated amount in the expense category given. `asRefund` on an outgoing row, a transfer or a linked row, or `refundOfTransactionId` without `asRefund`, answers 400 `import.refundInvalid`; a purchase that is not a visible expense answers `transaction.refundOriginalInvalid`. The row's `amount` stays the bank's positive size.
Since 2026-09-29 confirm also takes an optional `statement` (`closingDate`, `closingBalance`, `closingCurrency`, echoed from the preview); for `camt053` or `genericCsv` in the account's currency it is recorded as a reconciliation of the account, and the response's `reconciliation` carries it, null otherwise. Recurring entry confirmation requires ExpectedDueDate. Transfer listing accepts an optional Date filter. 2FA setup/disable requires Password. Resetting another user's password requires NewPassword and the administrator's own CurrentPassword, with ResetTwoFactor optional. Updating a transfer takes the body of creating one; updating a conversion takes the body of creating one without the account. The broker import result carries Splits, SkippedCorporateActions per type and PositionMismatches, which is null when the report has no Open Positions section.

`/api/users/me/dashboard-layout` is the signed-in user's own dashboard layout and is open to every signed-in user, under the `Dashboard` tag. `GET` answers `order` (every card id this version knows, saved ones first), `hidden` and `isDefault`; `PUT` takes `order` and `hidden` as lists of card id strings and answers the same shape, refusing an unknown id with `dashboard.cardUnknown` and a repeated one with `dashboard.cardDuplicate`; `DELETE` forgets the saved layout and answers the default. The card ids are the `DashboardCard` enum of the contract. See [Dashboard](features/dashboard.md).

`PUT /api/users/me/email-notifications` takes `{ types }`, the notification kinds the signed-in user also wants by email, and answers the profile with `emailNotificationTypes`. It is open to every signed-in user under the `Users` tag, refuses a missing list with `required`, a repeated kind with `collection.invalidSize` and an unknown one with a 400, allows an empty list, and is throttled to 20 calls per five minutes. `PUT /api/users/me` carries only the display name and the optional password change. See [Email](features/email.md).

`PUT /api/users/me/language` takes `{ language }`, `en` or `lt`, the language every email and Discord message to the signed-in user is written in, and answers the profile, whose `language` is null until one is saved. Anything else is refused with 400 `enum.invalid`; it is open to every signed-in user under the `Users` tag and throttled to 20 calls per five minutes. See [Monthly digest](features/monthly-digest.md#the-members-language).

`/api/users/me/discord` is the signed-in user's own Discord webhook, open to every signed-in user under the `Users` tag. `GET` answers `hasWebhook`, `isEnabled`, `types`, `lastDeliveredAt`, `lastError`, `disabledByDiscord` and `unreadable`, never the URL; `PUT` takes `webhookUrl`, `isEnabled` and `types`, where an empty URL keeps the stored one; `DELETE` removes the webhook and its unsent posts; `POST /test` posts a test message at once and answers Discord's own error. `PUT` is throttled to 20 calls and the test to 10 calls per five minutes. `GET` and `PUT /api/settings/discord` are administrators only and carry `{ enabled }`; `GET /api/settings/public` carries the same flag as `discordEnabled`. See [Discord notifications](features/discord-notifications.md).

Goal bodies carry `funding` (`manual` or `account`), `fundingAccountId` and `fundingSharePercent`, a whole percentage from 1 to 100 that defaults to 100 when omitted. `funding` defaults to `manual`, so a body written before this addition still creates the goal it used to. A funded goal must name an account and a manual goal must not, each refused by the validator with `fundingAccountId` as the field at fault, and an account that does not exist or is not visible to the caller answers 400 `reference.notFound` without naming a field, exactly as a recurring bill's account does. `currentAmount` stays required for a manual update and is ignored for a funded one, which is what preserves it across a switch. The response adds those three fields and `progressAmount`: the stored `currentAmount` for a manual goal, the computed share of the funding account's reporting balance for a funded one, never below zero, and null when that account is archived or no longer visible.

`PATCH /api/goals/{id}/progress` (since 2026-10-01) changes only a manual goal's saved amount: the body holds exactly one of `currentAmount`, the new amount, or `delta`, added to the stored one and negative to take money out (`required` on `currentAmount` for neither, `value.mustBeEmpty` on `delta` for both). It answers the goal, 404 for one the caller cannot see, 400 `goal.notManual` for a goal funded from an account and 400 `money.nonNegative` when a delta would take the amount below zero; above the target is allowed. A read-and-write token may call it, with `Idempotency-Key`. See [Goals](features/goals.md#moving-progress-without-the-whole-goal).

Recurring entry bodies carry `shape` (`expense`, `income` or `transfer`) and `toAccountId`. Both default to what a body written before this addition meant, an expense with no destination account, so such a body still creates the schedule it used to. A transfer must name `accountId` and `toAccountId`, they must differ, and it must leave `categoryId` empty; an expense or an income must leave `toAccountId` empty. Each rule names the field at fault and answers `required`, `transfer.sameAccount` or `value.mustBeEmpty`, and the same rules apply to an update, so a shape change that would leave a required field empty is refused instead of stored. A category must match the shape: an expense wants an expense category and an income an income category, both refused with `category.wrongType`. `POST /api/recurring-bills/{id}/confirm` answers `bill`, a nullable `transactionId` and a nullable `transferId`; an expense or an income fills the first, a transfer the second. Its body gained `receivedAmount`, which is passed to the ordinary transfer create path, so a transfer between two currencies is refused with `transfer.receivedAmountRequired` until it is given, exactly as `POST /api/transfers` is.

`POST /api/recurring-bills/{id}/skip` marks the due occurrence done without writing a transaction or a transfer. Its body is `expectedDueDate` and an optional `transactionId`, the row that paid the occurrence, used only to link a debt payment when the entry pays a tracked debt. It answers the entry with its new `nextDueDate`, 404 for an entry the caller cannot see, 400 `recurringBill.inactive` and 409 `conflict.stale` when the date is not the next due date, exactly as confirm does, and marks the entry's unread reminders read. A personal API token cannot call it. See [Recurring entries](features/recurring-bills.md#marking-an-occurrence-done).

`GET /api/recurring-bills/calendar?month=YYYY-MM` is read-only and answers one month of the caller's active recurring entries: `from` and `to` (the month's first and last day), `expectedOut`, `expectedIn` and `paidOut` in the reporting currency, `partial` (an estimate or an amount without a fresh rate is inside a figure), `unpriced` (expense and income entries with no amount) and `occurrences`, by date and name, each with `date`, `billId`, `name`, `shape`, a nullable `amount` and `currency`, `estimated`, `status` (`due`, `overdue`, `paid` or `noMatch`), `isNextDue`, `unconfirmed`, `accountNotVisible`, `accountId` and, for a paid expense or income, `transactionId`. A month that is missing or not `YYYY-MM` answers 400 `month.invalid`, one more than 12 months from the current one 400 `range.invalid`, and the route answers 404 `feature.disabled` while `RecurringBills` is off. See [Recurring entries](features/recurring-bills.md#calendar).

`GET /api/recurring-bills/suggestions` is read-only and writes nothing. It answers a list of subscription candidates, the soonest expected occurrence first, each with `description` (the normalized text the group was formed on), `accountId`, a nullable `categoryId` filled only when every occurrence agrees, `cadence`, `typicalAmount` (the median, as a decimal string like every other money field), `occurrenceDates` in ascending order and `nextExpectedDate`. Both routes sit in `RecurringBillsGroup` under the `/api/recurring-bills` prefix on purpose, so the feature gate covers them with the rest of the feature and nothing else changes. `POST /api/recurring-bills/suggestions/dismiss` takes `accountId` and `description`, normalizes the description again on the server, and answers 204; an account the caller cannot see answers 400 `reference.notFound`, and dismissing the same group twice answers 204 without writing a second row. There is no create endpoint for a candidate: the client fills the ordinary `POST /api/recurring-bills` body and that path's validation is the only one there is.

`GET /api/categorization-rules/suggested` is read-only too. It answers at most 20 suggested rules, most rows first, each with `key` (the normalized description the group was formed on), `name`, `match`, `pattern`, `categoryId`, `evidence` (how many rows back it) and `lastSeen`, and an empty list when the caller already has 100 rules. The optional `transactionId` narrows the answer to the one suggestion that row backs, and only while it has exactly three rows; an id the caller cannot see answers an empty list, not 404. `POST /api/categorization-rules/suggested/dismiss` takes `key` and `categoryId`, normalizes the key again and answers 204; a category the caller cannot see answers 400 `reference.notFound`, and a second dismissal of the same pair writes nothing. There is no accept endpoint: the client posts the suggestion to `POST /api/categorization-rules`. See [Categorization rules](features/categorization-rules.md#suggested-rules).

Recurring entry bodies also take an optional `matchKey`, the bank text the entry's charges carry, at most 200 characters, normalized on the server and stored as null when empty; a body without it clears it. `GET /api/recurring-bills` answers `matchKey` and, while the `UnusualAmounts` feature is on, a nullable `latestMatch` on each active expense entry with an account: the latest matching charge of the last 13 months as `date`, `amount` in the account's currency, a nullable `expected` and `isPriceRise`. The single-entry answers (get, create, update and confirm) fill it the same way. See [Unusual amounts](features/unusual-amounts.md).

Since 2026-09-29 a transaction's `amount` is signed for an expense: negative means a refund, money back in an expense category, and `reportingAmount` carries the same sign. An expense amount must not be zero (`money.nonZero`), an income amount stays positive (`money.positive`), and a refund with `lines` answers `transaction.splitNotAllowed`. Create and update bodies take an optional `refundOfTransactionId`, allowed only on a refund, naming a visible expense that is not a refund and not the row itself, or 400 `transaction.refundOriginalInvalid`. `GET /api/transactions` and `GET /api/transactions/{id}`, and the create and update responses, answer `refundOf` (`id`, `date`, `description` of the purchase, null when there is none or it is not visible) and `refundedAmount` (the reporting-currency total of the visible refunds naming the row, as a positive number, or null). The summary's `totalExpense` and the CSV and PDF exports carry refunds signed, so every expense total is net. See [Transactions](features/transactions.md#refunds).

The transaction list, summary and both exports take `unusual`: `true` keeps the expenses flagged as unusual and not marked "not unusual", and it is ignored while the `UnusualAmounts` feature is off. `GET /api/transactions` and `GET /api/transactions/{id}` answer `unusual` (`basis`, `typicalAmount`, `factor`, `sampleSize`, or null) and `unusualDismissed`, both empty while the feature is off. `POST /api/transactions/{id}/unusual/dismiss` marks a row "not unusual" and `DELETE` of the same route removes the mark; both answer 204, 404 `resource.notFound` for a transaction the caller cannot see and 404 `feature.disabled` while the feature is off. They sit in `TransactionsGroup`, which has no feature, and carry `RequiresFeature` on the endpoint itself; `GET /api/transactions/places` does the same for `Locations`, and these are the only gated routes outside a gated group. The Swedbank preview answers `unusual` on each expense row in the same shape.

The same four also take `uncategorized`: `true` keeps the transactions without a category and the split transactions with at least one line without one. It is a property of the shared `TransactionFilterRequest`, belongs to no feature, and is what the month-end checklist counts and links to.

Since 2026-10-01 they also take `duplicates`: `true` keeps the [possible duplicates](features/transactions.md#possible-duplicates), transactions with another one on the same account of the same type, amount and currency within three days and with the same payee key, or the same trimmed description when either has none. Like `uncategorized` it belongs to no feature, and the month-end checklist counts it. `POST /api/transactions/{id}/duplicates/keep` answers "keep both" for every pair the filter finds with that row and answers 204, also when there is none, or 404 `resource.notFound` for a transaction the caller cannot see; it is not reachable with an API token.

They also take `payee`, since 2026-09-29: the value is normalized like a stored `PayeeKey` and keeps the transactions whose key equals it, so a `payeeKey` of the report and a raw description both work; a value with nothing left after normalizing is ignored and more than 500 characters answers `text.tooLong`. See [Transactions](features/transactions.md#payee-filter).

Since 2026-09-30 the create and update bodies take an optional `note`, at most 1000 characters (`text.tooLong`), and every transaction response answers it; `search` on the four filtered endpoints matches it as well as the description. See [Transactions](features/transactions.md#notes).

Since 2026-09-30 the transaction create and update bodies take an optional `spreadMonths`, 2 to 36 (`range.invalid`), refused on a split with `transaction.splitNotAllowed` and on a refund with `transaction.spreadRefund`; every transaction response answers `spreadMonths` and `spreadUntil`, the date of the last monthly slice. The four filtered endpoints take `spreadOverlap=true`, which with both `dateFrom` and `dateTo` also keeps spread rows dated before the range whose slices reach into it, and is ignored otherwise. Recurring entry bodies and responses carry `spreadMonths` too, on the expense and income shapes only (`value.mustBeEmpty` on a transfer). The report, dashboard, budget and month-close figures count each slice in its month; see [Transactions](features/transactions.md#spreading-over-months).

Since 2026-10-01, while the `Locations` feature is on, the transaction create and update bodies take optional `place` (at most 120 characters, `text.tooLong`), `latitude` and `longitude` (from −90 to 90 and −180 to 180, together or neither, else `transaction.locationInvalid`; kept to five decimals), and every transaction response answers them; while it is off responses answer them null, a create stores none and an update keeps the stored values. The four filtered endpoints take `place`, a substring match ignoring case, and `search` matches the place too; both are ignored while the feature is off. `GET /api/transactions/places?search&lat&lon` answers up to 20 `{ name, count, latitude, longitude, nearby }` from the places the caller can see, the nearest within 150 metres first with `nearby: true` when `lat` and `lon` are sent; it is token-readable and answers 404 `feature.disabled` while the feature is off. With `own=true` it answers every place of the rows the caller entered, by name, without the limit of 20. `POST /api/transactions/places/rename` takes `{ places, name }`, 1 to 50 places and a name, each at most 120 characters (`required`, `text.tooLong`, `collection.invalidSize`), sets the place of every row the caller entered whose place matches one of them ignoring case and surrounding spaces, and answers `{ updated }`; coordinates and `UpdatedAt` stay, a change on a shared account is one summarising activity-log row, it is not token-writable and it answers 404 `feature.disabled` while the feature is off. The report summary answers `expenseByPlace` (`place`, `amount`, `comparisonAmount`, `count`, `latitude`, `longitude`), empty while the feature is off. A receipt reading answers `result.address` and, for a freshly uploaded photo with GPS tags while the feature is on, `photoLatitude` and `photoLongitude`. See [Transaction locations](features/transaction-locations.md).

Since 2026-10-01 `GET /api/transactions/ledger` takes the filters, sort and paging of `GET /api/transactions` and answers `items` of `{ kind, transaction, group }`: `kind` `transaction` with the list's transaction, or `group` with `id`, `name`, `firstDate`, `lastDate`, `memberCount`, `matchingCount` and `netReportingAmount` of one of the caller's [transaction groups](features/transaction-groups.md) with a matching member; `total` counts items. Every transaction response answers `groupId`, only when the group is the caller's, and `enteredByMe`. `/api/transaction-groups` lists the caller's groups (`id`, `name`, `memberCount`, `firstDate`, `lastDate`), creates one from `{ name, transactionIds }` (201 with `Location`), renames it with `PUT /{id}` `{ name }`, adds rows with `POST /{id}/members` `{ transactionIds }` (204), removes one with `DELETE /{id}/members/{transactionId}` (204) and ungroups with `DELETE /{id}` (204, trash kind `transactionGroup`); `GET /{id}/members` takes the ledger's filters and answers `{ items, truncated }`, at most 200 members. The name is 1 to 120 characters (`text.tooShort`, `text.tooLong`), the rows 1 to 200 (`required`, `collection.invalidSize`); a row the caller cannot see answers 404 `resource.notFound`, a visible row someone else entered 403 `access.forbidden`, and a row already in another group 409 `transactionGroup.memberTaken`. The three `GET` routes are token-readable; the writes are not token-writable.

Since 2026-10-01, while the `LearnedCategories` feature is on, an import preview row also carries `learnedCategoryId` and `learnedConfidence` (0 to 1), the category a model trained on the caller's categorized rows guesses for a row that is not a duplicate and got no category from a rule, both null otherwise. `POST /api/transactions/suggest-category` takes `{ accountId, type, amount, description }` (amount zero or more, description 1 to 500 characters) and answers `{ categoryId, source, ruleName, confidence }`, where `source` is `rule` or `learned` and every field is null when neither has an answer; an account the caller cannot see answers 400 `reference.notFound`. It only reads, is a `POST` so the description stays out of URLs, and is not token-writable. `GET /api/transactions/uncategorized-suggestions` takes the ledger's filters and answers, for the newest 200 matching transactions without a category and not split, `[{ transaction, categoryId, source, ruleName, confidence }]` for those that got a suggestion; it is token-readable and answers 404 `feature.disabled` while the feature is off. The suggestion has no gate: it answers a rule while `CategorizationRules` is on and a guess while `LearnedCategories` is on, every field null with both off. `POST /api/transactions/bulk-category` takes `onlyUncategorized` (false by default): when true only the listed rows that still have no category change and `updated` counts them. See [Learned categories](features/learned-categories.md).

Since 2026-09-30 `POST /api/investments/import/trade-csv` takes `accountId` and a CSV `file` of trades, dividends, taxes, interest and fees and answers the broker import's counts; investment entries it writes carry `source` `tradeCsv`. See [Investments](features/investments.md#trade-csv-from-any-broker).

Since 2026-09-30 `GET /api/receipts/items` takes `dateFrom`, `dateTo` and an optional `search` and answers `{ items: [{ key, name, currency, amount, count, lastBought }], receipts }`, the caller's receipt items summed by normalized name. See [Receipt reading](features/receipt-reading.md#spending-per-item).

Since 2026-10-01, while the `ReceiptReading` feature is on, `search` on the filtered transaction endpoints and the ledger also matches the item names of the caller's own readings of the files attached to a transaction, and a listed transaction with a matching item answers `receiptItem` (`name`, `warrantyUntil`, the warranty date of that file), null otherwise; the single-transaction response never carries it. See [Receipt reading](features/receipt-reading.md#finding-a-purchase-by-item).

Since 2026-09-30 `PUT /api/attachments/{id}/warranty` takes `{ warrantyUntil }` (a date or null) and answers the attachment, whose responses carry `warrantyUntil`; a `warrantyExpiring` notification follows 30 days before. See [Attachments](features/attachments.md#warranty-dates).

Since 2026-09-30 the import preview and confirm take `format=ofx` and `format=mt940` beside `swedbankCsv`, `camt053` and `genericCsv`; a file that is not of the format answers `import.invalidFile`, and the closing balance of both is kept as a reconciliation like a camt.053's. See [Bank statement import](features/bank-statement-import.md#ofx-and-mt940).

Since 2026-09-30 `GET /api/investments/portfolio` also answers `annualizedReturn` (a fraction string such as `0.0734`, or null) and `byType` and `byCurrency` (`{ key, marketValue }` slices of the open holdings, largest first). See [Investments](features/investments.md#annualized-return-and-allocation).

Since 2026-10-01 `GET /api/investments/allocation-targets` answers the caller's own target allocation, `{ dimension, targets: [{ key, share, symbol }] }` with `dimension` one of `type`, `currency` and `security` (null without targets), `share` a percentage string and `symbol` filled for a security, and is readable with an API token; `PUT` takes `{ dimension, targets: [{ key, share }] }` and replaces every target, an empty list removing them, refusing `allocation.shareInvalid`, `allocation.sharesTotal`, `allocation.bucketUnknown` and `allocation.bucketDuplicate`. See [Investments](features/investments.md#target-allocation).

Since 2026-09-30 `GET /api/accounts/forecast` takes an optional `whatIfAccountId`, `whatIfAmount` (signed, non-zero) and `whatIfDate`, all three or none, and adds that unsaved payment as an entry with source `whatIf`. See [Cash-flow forecast](features/cash-flow-forecast.md#trying-a-payment).

Since 2026-09-30 category bodies take an optional `parentId` and responses answer it (`category.wrongType` for a parent of the other type, `category.nestingInvalid` for nesting deeper than one level); `categoryId` on the four transaction filters includes the sub-categories of a parent, and category breakdown items answer `parentId`, `parentName` and `parentIcon`. See [Categories](features/categories.md#groups).

Since 2026-09-30 a budget body takes `categoryId` or `tagId`, exactly one (`required` on `categoryId` otherwise), and `BudgetResponse` answers `categoryId`, `tagId` and `name` in place of `categoryName`. See [Budgets](features/budgets.md#budgets-on-a-tag).

Since 2026-09-30 every transaction response answers `payeeName`, the caller's own name for the row's `PayeeKey` or null, and `search` also matches it. `GET /api/payees` lists the caller's payee names (`id`, `payeeKey`, `name`), `PUT /api/payees` takes `{ payee, name }`, normalizes `payee` like a stored key (nothing left answers `text.invalidFormat`) and creates or renames the name, and `DELETE /api/payees/{id}` removes it (204, or 404 `resource.notFound`). The report's `expenseByPayee` items and the recurring-entry suggestions carry the same `name`. See [Payee names](features/payee-names.md).

They also take `amountMin` and `amountMax`, since 2026-09-30: inclusive bounds on the size of the amount in the transaction's own currency, so a refund matches like a purchase of the same size. Each must be a non-negative amount with at most two decimals (`money.nonNegative`), and `amountMax` below `amountMin` answers `range.invalid`. See [Transactions](features/transactions.md#amount-range-filter).

`/api/month-close` belongs to the `MonthClose` feature and tag, and every route answers 404 `feature.disabled` while it is off. `{month}` is `YYYY-MM` with a year from 2000 to 2999; anything else answers 400 `month.invalid`. Every route acts on the caller's own closes under the active household scope (the `X-Active-Household` header, or none for "Everything"). `GET /api/month-close?year=` (the current year when left out) answers `year` and twelve `months`, each with `month`, `status` (`notEnded`, `open`, `closed` or `closedChanged`) and `closedAt`. `GET /api/month-close/{month}` answers the review: `month`, `monthEnd`, `status`, `closedAt`, `note`, `checklist` (`uncategorized`; `unconfirmedRecurring` and `unusual`, each null while its feature is off; and `accounts`, since 2026-09-29 in place of `imports`: one `{ accountId, accountName, state, date, difference, currency }` per account with a reconciliation or, while `Import` is on, an imported row, `state` being `reconciled`, `differs`, `imported` or `behind`, always present), `figures` (the report summary of the month with the `previousMonth` comparison), `budgets` (monthly budgets as of `monthEnd`, null while `Budgets` is off), `netWorthStart` and `netWorthEnd` (net worth snapshot points, null when there is none or `NetWorth` is off) and `drift`, null unless the month is closed. `POST /api/month-close/{month}` takes `{ note? }` (at most 1000 characters; a missing note keeps the stored one), closes or re-closes the month and answers the review; a month that has not ended answers 409 `monthClose.notEnded`. `PUT /api/month-close/{month}/note` takes `{ note? }`, answers the review, and 404 `resource.notFound` when the month is not closed. `DELETE /api/month-close/{month}` reopens and answers 204, also when there was nothing to reopen. See [Month-end close](features/month-end-close.md).

`GET /api/reports/summary` answers `expenseByCategory` and `incomeByCategory`. Items of both lists, and of `GET /api/dashboard/category-breakdown`, carry an optional `syntheticGroup`: null for a real category and for uncategorized amounts, `investmentIncome` or `investmentTaxesAndFees` for the total of investment ledger entries, which has `categoryId` null and an English `categoryName` as a fallback. A client names such a group in the viewer's language and does not link it to a category. `GET /api/dashboard/category-breakdown` always fills `comparisonAmount` and answers `comparisonStart` and `comparisonEnd`: the same period of the previous month, cut to the same days while the month has not ended ([Dashboard](features/dashboard.md#month)). The income and expense figures of the report and of the three dashboard endpoints include those investment entries while the `Investments` feature is on.

`GET /api/reports/summary` also answers `expenseByPayee`, since 2026-09-29: at most 50 `PayeeBreakdownItem`s with `payeeKey`, `label` (the newest description), `amount`, `comparisonAmount` and `count`, over whole expense transactions grouped by the stored `PayeeKey` and ordered by the larger of the two amounts. The expenses without a description are one entry with `payeeKey` and `label` null. A `payeeKey` is what the transaction list's `payee` filter takes. The month-close review's `figures` carry it too. See [Reports](features/reports.md#expense-by-payee).

`GET /api/reports/summary` also takes `comparison`: `none` (the default, and the same as leaving it out), `previousPeriod` for the same number of days immediately before the range, `previousMonth` for the same range a month earlier, or `previousYear` for the same range a year earlier, where for the last two a range that ends on the last day of a month again ends on the last day of the earlier month, so 1–31 March meets 1–28 (or 29) February. With a comparison the response gains `comparison` — the earlier period's `mode`, `periodStart`, `periodEnd`, `totalIncome`, `totalExpense` and `net` — while every category, tag and payee entry fills `comparisonAmount` and every trend point gains `comparisonBucketStart`, `comparisonIncome` and `comparisonExpense`. A category, synthetic group, tag or payee that only one of the two periods touched is one entry with `0.00` on the empty side, and the breakdowns are ordered by the larger of the two amounts. Trend points are paired by position: the first bucket of the range meets the first bucket of the earlier one, both bucketed the same way, and a bucket with no counterpart compares against zero. Every one of those fields is null without the parameter, so a client of the older shape is unaffected. The difference and its percentage are the client's to compute, because a change from a zero base has no percentage to show; `CategoryBreakdownItem` gained `comparisonAmount` too, and it stays null everywhere the dashboard uses it.

`PUT /api/investments/securities/{id}/price` takes `lastPrice` and an optional `lastPriceDate`, which defaults to today in the installation time zone and is refused with `range.invalid` when it is in the future. It records the price for that date and answers the security, whose `lastPrice` changes only when the date is the newest one. `GET /api/investments/securities/{id}/prices?from&to` lists the recorded points, newest first, to every signed-in user. `DELETE /api/investments/securities/{id}/prices/{date}` removes one point and answers 204, 403 `security.notHeld` under the same rule as setting a price, or 404 when the security or the point does not exist. `GET /api/investments/value-history?from&to&accountId` answers `reportingCurrency` and `points`, each with `date`, `marketValue`, `costBasis` and `isPartial`; `to` defaults to today and is never later, `from` defaults to one year before `to`, and `from` after `to` is `range.invalid`. The series is daily up to 92 days, weekly up to 731 days and monthly beyond, counted back from `to`, begins no earlier than the first trade, and is empty when nothing was traded by `to`. All of them sit under `/api/investments` and answer 404 `feature.disabled` while the feature is off.

Since 2026-09-30 a price point also answers `source` (`manual`, `broker`, `feed` or `file`), and a security answers `priceSource` (`none`, `eodhd` or `kraken`), `priceSymbol` and `priceSyncError`, and takes the first two in its create and update requests; a source from a non-administrator answers 403 `access.forbidden`, one without a symbol `required`, Kraken on anything but EUR crypto `range.invalid`, EODHD without a saved key `marketPrices.keyRequired`. `POST /api/investments/securities/{id}/prices/import` takes a multipart `file`, a CSV of at most 5 MB with `date` and `price` columns, under the rule for setting a price, and answers `written`, `skipped` and `unreadable`; `import.missingColumns` and `import.invalidFile` refuse the file. `POST /api/investments/securities/{id}/price-symbol/find` is for administrators, asks EODHD for the security's ISIN, saves nothing and answers a list of `symbol`, `exchange`, `name` and `currency`. `GET` and `PUT /api/settings/market-prices` read and write the daily fetch switch and the EODHD key: the answer is `enabled`, `hasKey`, `lastRunAt`, `callsLeft` and `failures` (`securityId`, `symbol`, `name`, `reason`, `at`), never the key, and the request's `eodhdApiKey` keeps the key when null and removes it when empty. `POST /api/settings/market-prices/sync` fetches now and answers `checked`, `written`, `failed` and `callsLeft`. The provider errors are `marketPrices.keyRequired`, `marketPrices.keyUnreadable`, `marketPrices.unavailable` and `marketPrices.rejected`; see [Live security prices](features/live-prices.md).

`GET /api/investments/tax-summary?year&accountIds` answers one calendar year of recorded investment activity on the accounts the caller can see. `accountIds` is up to 50 ids separated by commas, refused as `text.invalidFormat` when it is anything else, and an id the caller cannot see is dropped rather than refused; absent, it means every visible account. `year` must be between 1900 and 2999, refused as `range.invalid`, and defaults to the newest year in `availableYears`, or to the current year when nothing is recorded. The answer carries `year`, `reportingCurrency`, `availableYears` (newest first, holding only the years with a sell, dividend, interest, withholding tax or fee), `accounts` (the id and name of each account included), `totals`, `disposals`, `cashEntries` and `isComplete`.
A `disposal` has `id`, `date`, `accountId`, `securityId`, `symbol`, `name`, `currency`, `quantity`, `proceeds`, `costBasis`, `gain`, the same three again as `reportingProceeds`, `reportingCostBasis` and `reportingGain`, and `lots`, each with `acquiredOn`, `quantity`, `cost` and `reportingCost`, oldest first. A `cashEntry` has `id`, `date`, `accountId`, `type` (`dividend`, `interest`, `withholdingTax` or `fee`), `symbol`, `description`, `currency`, `amount` and `reportingAmount`, with withholding tax and fees reported as positive amounts paid so they match the portfolio's own year totals. `totals` holds `proceeds`, `costBasis`, `gains`, `losses`, `realizedGain`, `dividends`, `interest`, `withholdingTax` and `fees`, all in the reporting currency. `isComplete` is false when a replayed holding is oversold, which makes a cost basis incomplete. A year with nothing recorded answers zeroed totals and empty lists rather than an error.
Nothing is computed beyond restating the entries: no tax, rate or allowance is applied.

`GET /api/investments/tax-summary/export?year&accountIds` answers the same year as a CSV attachment named `investment-tax-summary-<year>.csv`, streamed without a `Content-Length`; its columns are on the [Exports page](features/exports.md). Both sit under `/api/investments` and answer 404 `feature.disabled` while the feature is off.

`GET /api/accounts/forecast?days=` projects each visible account's main-currency balance from today for `days` days, 30 to 90 and 90 by default, refused as `range.invalid` outside that range. It answers `from`, `to`, `accounts` (only those with an entry in the horizon, those that go below zero first) and `notCounted`, the caller's active recurring entries it could not place, each with `reason` `noAccount`, `noHistory`, `accountNotVisible` or `noExchangeRate` (a transfer into another currency whose newest rate is more than five days old or missing: it still leaves the source account, and only its arrival is left out). Each account carries `startBalance`, `usualDailySpending`, `lowestBalance`, `lowestOn`, `belowZeroOn`, `belowZeroWithSpendingOn`, `otherCurrencies` and `entries` (`date`, `source` `recurring` or `ledger`, `billId`, `name`, `shape`, signed `amount`, `estimated`, `overdue`, `balanceAfter`). The literal segment takes precedence over `/api/accounts/{id}`, and the route carries `RequiresFeature(RecurringBills)`, so it answers 404 `feature.disabled` while that switch is off. Details in [Cash-flow forecast](features/cash-flow-forecast.md).

`GET /api/accounts/{id}/reconciliations/preview?date=` answers the ledger balance of the account on a statement date in its main currency with `date`, `currency`, `ledgerBalance`, `previous` (the latest reconciliation before the date, or null), `rows` (at most 100 signed movements after `previous` up to the date, newest first, each `kind`, `id`, `date`, `description`, `amount`) and `rowCount`. `GET /api/accounts/{id}/reconciliations` answers the newest 24 reconciliations, each `id`, `date`, `balance`, `currency`, `source` (`manual` or `statement`), `ledgerBalance`, `difference` (statement minus ledger, computed on read) and `createdAt`. `POST /api/accounts/{id}/reconciliations` takes `{ date, balance }`, records or replaces the balance on that date and answers it; `DELETE /api/accounts/{id}/reconciliations/{reconciliationId}` answers 204. A date after today answers 400 `reconciliation.futureDate`, and an account the caller cannot see, or a reconciliation that is not there, 404 `resource.notFound`. Details in [Reconciliation](features/reconciliation.md).

`GET /api/accounts/archived` answers the archived accounts the caller would see if they were active — their own, and the shared accounts of households both they and the owner still belong to — narrowed by the active household exactly as `GET /api/accounts` is, sorted by name. Each row carries `id`, `name`, `description`, `iban`, `type`, `startingBalance`, `currency`, `scope`, `householdId`, `archivedAt` and `canRestore`, which is true only for the owner. There is no balance: the transactions of an archived account are filtered out with it. `POST /api/accounts/{id}/restore` takes no body and answers 200 with the account as `GET /api/accounts/{id}` would, balance included. It answers the same 200 for an account that is already active, which makes it safe to repeat, 403 `access.forbidden` when the caller can see the archived account but does not own it, and 404 `resource.notFound` when no such account, archived or active, is visible — including one that belongs to another household than the active one. An account still marked as shared into a household its owner no longer belongs to comes back personal rather than being refused. Details in [Accounts](features/accounts.md).

`GET /api/households/{id}/audit?page&pageSize&memberId&kind&dateFrom&dateTo` answers a page of the household's activity, newest first. Each row carries `id`, `occurredAt`, `actorUserId`, `actorName` (looked up on read), `action` (`created`, `updated`, `deleted`, `restored`, `imported`, `shared`, `unshared`, `memberAdded`, `memberRemoved`, `memberRoleChanged` or `renamed`), `entityKind` (`account`, `transaction`, `transfer`, `conversion`, `investmentTransaction`, `category`, `tag`, `household`, `member`, `attachment`, `sharedExpense` or `settlement`), a nullable `entityId` (null for a bulk edit; the account for an import; the user for a membership row), the stored `description`, a nullable `count` for an import or bulk edit, and `changes`, a list of `{field, from, to}` display strings for an update, a rename or a role change. `memberId` filters by actor, `kind` by entity kind, `dateFrom` and `dateTo` by whole days in the installation's time zone; a start after the end answers 400 `range.invalid`. A caller who is not a member, an unknown or deleted household, and any household other than the one active in `X-Active-Household` all answer 404 `resource.notFound`. The route is under the Households feature switch. What is written, and when, is in [Audit log](features/audit-log.md).

`GET /api/trash` answers a page of what the signed-in user deleted in the last 30 days and has not restored, newest first; each row carries `id`, `kind`, `entityId`, `description` and `deletedAt`. `kind` is one of `transaction`, `transfer`, `conversion`, `budget`, `goal`, `asset`, `debt`, `recurringBill`, `investmentTransaction`, `category`, `tag`, `categorizationRule`, `household`, `attachment`, `csvImportMapping`, `sharedExpense` and `settlement`, and a kind whose feature is switched off is left out of the list. `POST /api/trash/restore` takes `kind` and `entityId` — the record's own id, not the trash row's — so the toast shown right after a delete and the Restore button on the screen call one operation, and answers 204. It answers 204 again when the record is already back, which makes it safe to repeat. `POST /api/trash/restore-transactions` takes `transactionIds` (1 to 200), restores each of the caller's deleted transactions through the same checks and answers 200 with `restored` and `refused`, a list of `{ transactionId, code, reason }` for the rows that stay in the trash; it is the undo of `POST /api/transactions/bulk-delete`, which takes `transactionIds` and answers `{ deleted }`. `POST /api/transactions/bulk-account` takes `transactionIds` and `accountId` and answers `{ moved, refused }`, refusing a conversion fee (`transaction.conversionFee`), a household split whose payer does not own the account (`settleUp.notPayer`) and a shared debt payment on an account outside the debt's household (`household.referenceNotShared`). None of the three is token-writable. See [Transactions](features/transactions.md#deleting-a-selection-and-moving-it-to-another-account).
Restoring a transaction brings its split lines and its tags with it, and its group while the group is live, and a conversion brings back its fee transaction; restoring a `transactionGroup` regroups its recorded members that are still live and in no other group; it is refused with 404 `resource.notFound` when nothing the caller deleted matches or the feature is off, 400 `restore.expired`, `restore.referenceMissing`, `restore.companionDeleted`, `restore.detailsLost` or `restore.securityChanged`, 400 `holding.oversold` or `holding.dependentSales` when the replayed holding of a restored investment entry would sell more than was held at some point, and 409 `restore.slotTaken` when another budget already holds the category and period. A category, tag, rule or household comes back with the rows its delete rewrote, where they are still in the state the delete left them; it is refused with 409 `restore.nameTaken` when another tag of the caller now has the tag's name, 400 `collection.invalidSize` when a restored rule would be the 101st, and 403 `access.forbidden` when the caller is no longer an owner of the household. A split expense or a settle-up payment is refused with 400 `household.notMember` when the caller is no longer a member of its household, `restore.referenceMissing` when a split's transaction is deleted or purged, and 409 `settleUp.alreadySplit` or `settleUp.transferTaken` when its transaction was split again or its transfer settles another payment.
`TrashGroup` declares no feature, for the reason the notification routes are ungated: the pair belongs to no single feature, so the service filters by feature per row instead.

Files attached to a transaction: `GET /api/transactions/{transactionId}/attachments` lists them oldest first, and `POST` to the same route takes one file as multipart/form-data in the field `file` and answers 201 with `id`, `transactionId`, `fileName`, `contentType`, `sizeBytes`, `sha256`, `uploadedById`, `uploadedByName` and `uploadedAt`. JPEG, PNG, WebP, HEIC and PDF up to 10 MB are accepted, ten per transaction; the type is read from the bytes and a disagreeing declared type is refused, and an image is stored upright without its metadata and a HEIC photo as JPEG, so `fileName`, `contentType`, `sizeBytes` and `sha256` describe the stored file (`attachment.empty`, `attachment.tooLarge`, `attachment.typeNotAllowed`, `attachment.contentMismatch`, 409 `attachment.limitReached`). `GET /api/attachments/{id}/content` streams the file as `Content-Disposition: attachment` with `nosniff`, a sandboxing policy and the SHA-256 as ETag (304 on a match); `DELETE /api/attachments/{id}` moves it to the trash as kind `attachment`. Every route answers 404 for a transaction or file the caller cannot see. A transaction response carries `attachmentCount`. See [Attachments](features/attachments.md).

`POST /api/receipts/read` takes multipart/form-data with exactly one of `attachmentId` (a file attached to a transaction the caller can see) and `file` (a new JPEG, PNG, WebP, HEIC or PDF of at most 10 MB, read and never stored, or since 2026-10-01 a receipt e-mail as `text/html`, `.html`, `.htm`, `message/rfc822` or `.eml`), plus `force`, and reads it on the server: a photo with Tesseract, a PDF from its text, an e-mail from its visible text. It answers `id`, `cached`, `result` (`merchant`, `date`, `currency`, `total`, `isReturn`, `pagesRead`, `pageCount`, `items` with `name`, `quantity`, `amount`, `discount`, `deposit`, `categoryId` and `remembered`, `adjustments` with `kind`, `label` and `amount`, and `unreadLines`, the lines between the first item and the total that could not be read) and `candidates` (for an uploaded file that is not a return, up to three visible unsplit expenses with the receipt's total within three days: `id`, `accountId`, `date`, `description`, `amount`, `currency`), and since 2026-10-01 `refundOf` (`id`, `date`, `description`) for a return receipt, the latest visible purchase from the same merchant of at least the returned total within 90 days, else null. Neither or both sources answer `required` or `value.mustBeEmpty`; the file answers the `attachment.*` codes of an upload; the rest are `receipt.unsupportedFile`, `receipt.pdfWithoutText`, `receipt.unreadable`, 409 `conflict.busy` and 503 `receipt.engineUnavailable`. It is throttled to 30 calls per five minutes.
`PUT /api/receipts/{id}/categories` takes `items`, each `index` and `categoryId` (null to forget), stores the choices and remembers them per item name, and answers 204; an index outside the reading answers `range.invalid`, a category that is not a visible expense category `reference.notFound` or `category.wrongType`, and someone else's reading 404. Since 2026-10-01 `GET /api/receipts/item-categories?search` lists the caller's remembered item categories, `items` (`id`, `key`, `categoryId`, `lastUsed`) most recently used first and at most 100, with `total` counting every match (`search` over 100 characters answers `text.tooLong`), and `DELETE /api/receipts/item-categories/{id}` forgets one for good (204, or 404 `resource.notFound`); see [Receipt reading](features/receipt-reading.md#remembered-items-on-the-categories-page). All of them sit under `/api/receipts` and answer 404 `feature.disabled` while `ReceiptReading` is off.
`GET /api/settings` answers `receiptReadingReady`, the switch and whether Tesseract is installed. See [Receipt reading](features/receipt-reading.md).

Debt bodies take optional repayment terms: `loanAmount`, `firstPaymentDate`, `termMonths` (1 to 600) or `monthlyPayment` but not both (`value.mustBeEmpty`), and `amortizationType` (`annuity`, the default, or `linear`, which takes no monthly payment). A body written before this addition leaves them out and stores a debt without a schedule, and because an update replaces the debt, leaving them out of a `PUT` clears them. A monthly payment that would not repay the loan within 600 payments is refused with `debt.paymentTooSmall`. A debt response carries the terms and `payoffDate`, the date of the last scheduled payment, or null when the terms are incomplete. `GET /api/debts/{id}/schedule?extraMonthly&lumpSum&lumpSumDate` answers the computed schedule — the regular payment, the scheduled balance and payments made as of today, and a `plan` with its payoff date, totals and one row per payment (date, payment, interest, principal, extra, balance) — plus, when an overpayment was asked for, `withExtra`, `interestSaved` and `paymentsSaved` for the same payment over a shorter term, and `lowerPayment` for the same number of payments at a lower payment. The overpayments are dot-decimal query strings (`money.nonNegative`), and a positive `lumpSum` needs `lumpSumDate` (`required`). It answers 404 for a debt the caller does not own and 400 `debt.scheduleIncomplete` for one without complete terms. See [Debt amortization](features/debt-amortization.md).

Debt bodies also take `tracksPayments` (false when left out). A debt response carries `tracksPayments`, `trackedBalance` (null unless it tracks payments), `trackedIncomplete` and `unavailablePayments`. `GET /api/debts/{id}/payments` lists the counted payments with their interest, principal and balance after; `POST` to the same route links `{ transactionId, kind?, principal? }` (`debt.notTracked`, `reference.notFound`, `debt.paymentWrongType`, `transaction.splitNotAllowed`, 409 `debt.paymentTaken`); `PUT` and `DELETE` on `/api/debts/{id}/payments/{paymentId}` change or remove a link; `GET /api/debts/{id}/payment-candidates?from` suggests unlinked expenses. Link, update and the debt endpoints answer the debt with its new tracked balance. Recurring entry bodies and responses carry `debtId`, accepted only on the expense shape (`recurringBill.debtShape`). Transaction list rows carry `debtPayment` for every member who can see the debt. See [Debt amortization](features/debt-amortization.md#tracking-payments).

Since 2026-09-29 the household settle-up routes are under the Households switch and every one answers 404 `resource.notFound` for a caller who is not a member, a deleted household, or a household other than the one active in `X-Active-Household`. `GET /api/households/{id}/settle-up` answers `balances`, the non-zero `{ userId, name, isMember, currency, amount }` of each member per currency (positive is owed to the member), and `payments`, the suggested `{ fromUserId, fromName, toUserId, toName, currency, amount }`.
Since 2026-10-01 the routes under `/api/contacts` keep the caller's people outside the household, under the Households switch and personal to the caller: another member's person answers 404 `resource.notFound`. `GET /api/contacts` answers each person by name with `id`, `name` and `balances`, the non-zero `{ currency, amount }` per currency, positive when the person owes the caller. `POST` and `PUT /api/contacts/{id}` take `{ name }` (1 to 100 characters); `DELETE` sends the person to the trash as `contact`.

`GET /api/contacts/{id}/entries?page&pageSize` pages the person's splits and payments newest first as `{ id, kind, date, description, amount, currency, direction, counted }`, `kind` being `split` (with the person's share as `amount` and `counted` false while the transaction is deleted) or `payment` (with `direction` `toContact` or `fromContact` and the note as `description`). `POST /api/contacts/{id}/payments` takes `{ direction, amount, currency, date, note }` and answers 201 with the entry; `DELETE /api/contacts/payments/{id}` sends it to the trash as `contactPayment`.

`POST /api/contacts/splits` takes `{ transactionId, method, own, shares }`, `own` being the caller's `{ weight, amount }` or null when they take no part and `shares` one `{ contactId, weight, amount }` per person, and answers 201 with `{ id, method, ownWeight, ownAmount, shares }`; it refuses with `reference.notFound`, `settleUp.notPayer`, `settleUp.notExpense`, `contact.noPerson`, `settleUp.sharesMismatch` and 409 `settleUp.alreadySplit`, which a household split now also answers for a transaction split with people. `PUT /api/contacts/splits/{id}` takes `{ method, own, shares }` and copies the transaction's current amount, date and description first; `DELETE` sends it to the trash as `contactSplit`. Transaction rows carry `contactSplit` with the same shape for their owner. Only the two `GET` routes are token-readable. See [Money with people outside the household](features/money-with-people.md).

Budget, goal and recurring entry requests take an optional `scope` (`personal`, the default, or `shared`) and `householdId`, as accounts, categories and tags do, and their responses carry both. A shared one answers 400 `household.referenceNotShared` when a category, tag or account it names is not shared with the same household, or a debt a recurring entry pays; only its owner changes its sharing or deletes it (403 `access.forbidden`).

Since 2026-09-30 asset and debt requests take the same optional `scope` and `householdId`, and their responses carry both. Members of the household edit a shared asset or debt, set and delete its valuations and link, change and unlink its payments; only its owner changes its sharing or deletes it (403 `access.forbidden`). A shared debt answers 400 `household.referenceNotShared` when a payment is linked from an account not shared with its household, when it is shared while its linked payments sit on such accounts, and when a recurring entry that pays it uses such an account. See [Shared assets and debts](features/households-and-sharing.md#shared-assets-and-debts).

`GET /api/households/{id}/shared-expenses?page&pageSize` pages the splits newest first: `id`, `payerId`, `payerName`, the copied `date`, `description`, `amount` and `currency`, `method` (`equal`, `shares` or `exact`), `shares` (`userId`, `name`, `weight`, `amount`), the caller's `myShare`, `counted` (false while the transaction is deleted), and `transactionId` and `amountDiffers`, which are null except for the payer. `POST` to the same route takes `{ transactionId, method, shares: [{ userId, weight?, amount? }] }` and answers 201 with the split; it is refused with 400 `reference.notFound`, `settleUp.notPayer`, `settleUp.notExpense`, `household.notMember`, `settleUp.noOtherMember` or `settleUp.sharesMismatch`, and 409 `settleUp.alreadySplit`. Between 1 and 20 members take part, each once (`collection.invalidSize`, `conflict.duplicate`); a weight is a whole number from 1 to 100 (`range.invalid`).
`PUT /api/households/{id}/shared-expenses/{expenseId}` takes `{ method, shares, refreshFromTransaction }` and `DELETE` removes it; both are for the payer only (403 `access.forbidden`). `GET /api/households/{id}/settlements?page&pageSize` pages the payments: `id`, `fromUserId`, `fromName`, `toUserId`, `toName`, `amount`, `currency`, `date`, `note` and `hasTransfer`. `POST` takes `{ fromUserId, toUserId, amount, currency, date, note?, transfer?: { fromAccountId, toAccountId }, transferId? }` and answers 201; it is refused with 403 `access.forbidden` when the caller is neither party, 400 `settleUp.samePerson`, `household.notMember`, `reference.notFound`, `settleUp.accountOwner` or `settleUp.currencyMismatch`, `value.mustBeEmpty` when both `transfer` and `transferId` are sent, and 409 `settleUp.transferTaken`.
`DELETE /api/households/{id}/settlements/{settlementId}` is for either party and leaves the transfer. Transaction rows, from the list and from `GET`, `POST` and `PUT /api/transactions` alike (one `ResponderAsync` builds all of them), carry `sharedExpense` for the payer (`id`, `householdId`, `householdName`, `method`, `shares`, `myShare`, `amountDiffers`), and account responses carry `ownerId`. The three `GET` routes are token-readable. See [Household settle-up](features/household-settle-up.md).

Asset and debt responses carry `currency`, the reporting currency of the day the asset or debt was created, in which its amounts stay; a debt's loan amount and monthly payment are in the same currency. `GET /api/networth` answers `accounts`, `assets`, `debts` and `netWorth` in the reporting currency with `isComplete`, false when an account balance, a holding, an asset or a debt could not be valued and was left out; `GET /api/networth/history` converts a point stored in an earlier reporting currency at the rate of its date. `GET /api/dashboard/summary` carries the same `isComplete` for `totalBalance`.

Budget bodies carry `period` (`weekly`, `monthly`, `quarterly` or `yearly`) and `rolloverEnabled`. Both default to the shape a body written before this addition had, monthly with no rollover, so such a body still creates the budget it used to. A category may carry one budget per period; a second one for the same pair is refused with 409 `conflict.duplicate`, on create and on an update that would move a budget onto a taken pair. The response adds `carriedAmount`, `effectiveLimit`, `rolloverEnabled`, `windowStart` and the inclusive `windowEnd`: `limitAmount` is still the typed limit, `effectiveLimit` is that plus the carry, and `spent` and `remaining` are measured inside the window instead of the calendar month. With rollover off the carry is zero and the three numbers read exactly as the two did before.

`GET /api/budgets/suggestions?period=` is read-only and requires `period`; a value that is not one of the four answers 400 `request.malformed` on the `period` field, because the query binding rejects it before validation runs. It answers `period` and `categories`: every visible expense category with spending in the last six complete windows of that period, by name, each with `categoryId`, `categoryName`, `windows` (`start`, the inclusive `end` and `spent`, oldest first; the window that holds today is left out and windows that end before the caller's earliest transaction are dropped), `median` and `suggestedLimit` (both null with fewer than three windows; `suggestedLimit` is also null when the median is zero), `isSteady` and `hasBudget` (the caller has a budget of this period on the category). The client creates a suggested budget through `POST /api/budgets`. See [Budgets](features/budgets.md#limits-from-history).
