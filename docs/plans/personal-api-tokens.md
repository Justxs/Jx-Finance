# Plan: Personal API tokens

Status: planned 2026-09-28. Size M. Independent of the other plans. It adds to the same Security section as [Passkeys](passkeys.md). The per-user export in [Data export per user](data-export-per-user.md) is deliberately not reachable with a token.

## Outcome

- In Settings › Personal › Security a member creates a read-only token. They give it a name and an expiry (30, 90 or 365 days, 90 by default) and confirm their password. The secret is shown once, with a copy button, and never again.
- The list shows each token's name, its prefix (`jxp_4fK2aQ9m…`), when it was created, when it expires and when it was last used. A token is revoked with one confirmed click.
- A script, or a spreadsheet on the member's own computer, sends `Authorization: Bearer jxp_…` and reads what the member reads in the browser:
  - accounts, transactions and the transaction CSV and PDF exports;
  - transfers, conversions, categories and tags;
  - reports and the dashboard;
  - budgets, goals, net worth, investments and recurring entries;
  - currencies and exchange rates, the household list and household activity.
- `X-Active-Household` narrows a token's view exactly as the household switcher narrows the browser's.
- Nothing can be written with a token, and nothing administrative can be read with one, even when the token belongs to an administrator.
- An administrator switches the feature on in Settings. It is off by default.
- `docs/features/personal-api-tokens.md` has copy-paste examples for curl, PowerShell, Python and Excel Power Query.

## Today

- Authentication is FastEndpoints' JWT bearer scheme. `JwtCookieAuthentication` reads the JWT from the `jx_access` cookie in `OnMessageReceived`. When there is no cookie, `JwtBearerHandler` falls back to the `Authorization` header, so an opaque token sent there would fail as a malformed JWT.
- Cookies are HttpOnly and SameSite=Strict. There is no antiforgery and no CORS policy, because no cross-origin caller exists.
- Every group derives from `ApiGroup`, which can already attach endpoint metadata (it does so for `RequiresFeature`).
- Throttling is FastEndpoints' `Throttle` per endpoint and per client address. There is no ASP.NET Core rate limiter.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Token format | `jxp_` + an 8-character public prefix + `_` + 32 random bytes in base64url. The table stores the prefix in clear with a unique index, and the SHA-256 hash of the secret part. A request is looked up by prefix and compared with `CryptographicOperations.FixedTimeEquals`, as `SessionService` compares refresh tokens | A PBKDF2 or Identity password hash; storing the token encrypted; a signed JWT | 256 random bits cannot be guessed, so a fast hash loses nothing, and a slow hash would cost every request. An encrypted token could be decrypted with the key ring. A JWT could not be revoked or show when it was last used without a lookup anyway. The prefix lets people and secret scanners recognise a leaked token |
| Transport | The `Authorization: Bearer` header only | A `?token=` query parameter for spreadsheet functions that cannot set headers | A query string ends up in Caddy's and Serilog's request logs, in shell history and in spreadsheet cells. The spreadsheet functions that cannot set headers, such as Google Sheets `IMPORTDATA`, run on Google's servers, which cannot reach a private installation anyway |
| Authentication | A second scheme, `PersonalApiToken`, as an `AuthenticationHandler` in `Infrastructure/Auth`, behind a policy scheme that becomes the default. It forwards to the token scheme when the header starts with `Bearer jxp_`, and otherwise to the existing JWT cookie scheme. A request that carries a token is authenticated by the token alone, and its cookies are ignored | Parsing tokens inside `JwtCookieAuthentication.OnMessageReceived` | Two small handlers each keep one rule. The cookie path and its per-request session check stay exactly as they are |
| Principal | `ClaimTypes.NameIdentifier` (so `HttpCurrentUser`, the query filters and the active household work unchanged), plus a `jx.token` claim holding the token id. There is no `sid` and never a role claim | Copying the user's roles | Administrator endpoints are writes, backups and settings. A read-only script needs none of them, and without a role claim `Roles(AppRoles.Admin)` refuses by construction |
| What a token may call | `GET` and `HEAD` on endpoints whose group opts in with `ApiGroup(…, tokenReadable: true)`, which attaches `TokenReadable` metadata. `PersonalApiTokenGateMiddleware`, placed after authorization, answers 403 `token.notAllowed` for anything else | Every `GET` endpoint | Several `GET` routes must stay out of reach: the backup download, which for an administrator holds every table; the SMTP settings; the session list; the token list itself; the per-user export; and attachment files. An allowlist of groups cannot forget a new route the way a denylist can |
| Readable groups | Accounts, Transactions, Transfers, Conversions, Categories, Tags, Reports, Dashboard, Budgets, Goals, NetWorth, Investments, RecurringBills, Currencies, Households and Diagnostics (`GET /api/ping`, for a script to test its token). Not readable: Auth, Users, Settings, Backups, Notifications, Trash, Imports, Attachments, MonthCloses and CategorizationRules | Per-endpoint flags | The groups match what a spreadsheet reports on. Feature gates still apply on top |
| Scopes | One implicit scope, read, with no column in v1 | A `Scopes` column now | There is one scope. When write scopes come, adding a column with a default is a one-line migration |
| Expiry | Required: 1 to 365 days, with presets of 30, 90 and 365 and 90 by default. There is no "never" | Tokens that never expire | A token in a forgotten script or workbook should die on its own |
| What ends a token | Expiry, revocation (the row is deleted), deactivation of the user, an administrator password reset and `--recover-admin`, which delete all of that user's tokens in their existing transaction, and the feature being switched off, which suspends them. The token is not tied to the security stamp, so changing your own password or two-factor keeps your scripts working | Tying tokens to the security stamp like sessions | An own password change is routine and should not break automation. An administrator reset or a deactivation means someone else may be in the account, so every credential goes |
| Last used | `LastUsedAt` is written by one conditional `ExecuteUpdateAsync … WHERE LastUsedAt < now - 1 minute`, so a script loop costs at most one write a minute | A write on every request; storing the client address | A write per request is waste. The address would be personal data the list does not need |
| Rate limit | ASP.NET Core's rate limiter (`AddRateLimiter` and `UseRateLimiter` after authentication), with a fixed window of 60 requests a minute per token id. A rejected request gets 429 `token.rateLimited` with `Retry-After`. Cookie requests are not limited, as today | FastEndpoints `Throttle` | `Throttle` counts per endpoint and per client address, while a script loop needs one budget per token across all routes |
| Household scope | The `X-Active-Household` header, and `activeHousehold` on the three download routes, pass through `ActiveHouseholdMiddleware` exactly as they do for the browser. A token is not bound to a household | A token pinned to one household | The member's personal records are visible in every scope, so pinning would not hide them. The header already gives a script the narrowing |
| CSRF | No antiforgery is added | Antiforgery tokens | A browser never adds an `Authorization` header to a cross-site request by itself, and without a CORS policy a cross-origin page cannot send one. Cookies stay SameSite=Strict |
| Audit | Tokens only read, so the household activity log has nothing to record. Creating and revoking a token is personal, like signing in, and is not logged there. The request log gets a `TokenPrefix` property through Serilog's diagnostic context, never the secret | A per-request audit table | The last-used time answers "is this token still in use". The logs answer "what did it read" for an operator |
| Switch | New `Feature.ApiTokens`, off by default. While it is off, token requests answer 403 `feature.disabled`, the section is hidden, and the rows are kept | Always on | The administrator decides whether scripts may reach the installation at all |
| Limits | 10 active tokens per user, names at most 60 characters | Unlimited | This keeps the list readable and bounds what a stolen session could create |
| Backups | The table is carried like the password hashes, so a restored installation keeps working tokens | Leaving it out like `UserSessions` | A token is a durable credential that the member chose to create, not state of one browser |

## Data model

| Change | Detail |
| --- | --- |
| New `PersonalApiToken` | Plain class in `Infrastructure/Auth` like `UserSession`, with no owner filter because it is read before the request is authenticated: `Id` (Guid), `UserId` (cascading foreign key to `AspNetUsers`), `Name` (max 60), `Prefix` (`character(8)`, unique), `SecretHash` (`character(64)`), `CreatedAt`, `ExpiresAt` and `LastUsedAt?`. It is indexed on `UserId` |
| `Feature.ApiTokens` | `HasDefaultValue(false)` |

Migration: `AddPersonalApiTokens`. `RetentionJob` deletes tokens 30 days after they expire, in `Retention` next to `PruneSessionsAsync`.

## Backend steps

1. **Entity, configuration and migration.**
2. **Handler.** `PersonalApiTokenAuthenticationHandler`:
   - parses the header and looks up the prefix with `AsNoTracking`;
   - compares the hash, and checks `ExpiresAt > clock.UtcNow` and `AppUser.IsActive`;
   - builds the principal and touches `LastUsedAt` as described above;
   - on failure answers 401 with `WWW-Authenticate: Bearer error="invalid_token"` and the problem `token.invalid`.

   In `JwtCookieAuthentication.AddJwtCookieAuthentication`, register the scheme and the policy scheme (`AddPolicyScheme` with `ForwardDefaultSelector`), and make the policy scheme the default authenticate and challenge scheme.
3. **Gate.** `Common/Middleware/PersonalApiTokenGateMiddleware` sits after `UseAuthorization` and before `FeatureGateMiddleware`. For a token principal it:
   - refuses anything but `GET` or `HEAD` on a `TokenReadable` endpoint (`token.notAllowed`);
   - refuses every request while `Feature.ApiTokens` is off (`feature.disabled`).

   `ApiGroup` gains `bool tokenReadable = false`, which is set in the groups listed above.
4. **Rate limiter.** `AddRateLimiter` with a global partitioned limiter keyed on the `jx.token` claim. Requests without a token get `RateLimitPartition.GetNoLimiter`. `OnRejected` writes the problem through `ProblemResponses.WriteAsync`.
5. **Service.** `IPersonalApiTokenService` and `PersonalApiTokenService` in `Endpoints/Auth/Services`:
   - **Create** confirms the password through `ReauthenticateAsync(password, ErrorCodes.PasswordIncorrect, …)`, which counts toward the lockout; refuses the eleventh token (`token.limitReached`, 409); generates the secret; and returns it once.
   - **List** returns the caller's tokens, expired ones included until they are purged, with an `Expired` flag.
   - **Revoke** hard-deletes one; an unknown id or someone else's answers 404.
6. **Endpoints** in `Endpoints/Auth/Tokens`, each carrying `RequiresFeature(Feature.ApiTokens)` metadata because `AuthGroup` has no feature:
   - `GET /api/auth/tokens`;
   - `POST /api/auth/tokens` with `{ name, expiresInDays, password }`, which answers 201 with `CreatedPersonalApiTokenResponse` (the listed fields plus `Token`). It is throttled to 5 per five minutes;
   - `DELETE /api/auth/tokens/{id}`.
7. **Credential resets.** `UserService.DeactivateAsync`, `UserService.ResetPasswordAsync` and `RecoveryCommand.RunAsync` delete the user's tokens. Their summaries say so.
8. **Redaction.** `CreatePersonalApiTokenResponse` and the create request print `Token` and `Password` as `SecretText.Hidden`, which `SecretRedactionTests` already enforces by name. Serilog request logging adds `TokenPrefix` in `EnrichDiagnosticContext`.
9. **Error codes:** `token.invalid` (401), `token.notAllowed` (403), `token.limitReached` (409) and `token.rateLimited` (429). The expiry range uses the shared range rule's code.

## Frontend steps

1. `just gen`. Create and revoke invalidate `/api/auth/tokens`.
2. **Security section.** `features/profile/api-tokens-section`, rendered in the `security` section of `profile-page.tsx` while `ApiTokens` is on:
   - a table (name, prefix, created, expires, last used or "Never"), with "Expired" as text;
   - a create dialog through `useServerForm`, with the name, an expiry select and the current password;
   - a result step showing the secret in a read-only input, a Copy button (`navigator.clipboard.writeText`) and the sentence "You will not see this token again";
   - revoke through `useConfirmedDelete`.

   Stories: empty, a list with an expired token, the created secret, a server error, and a `play` that creates one.
3. **Settings.** The switch in `features-fields.tsx` and the storybook settings fixture.
4. **Locales.** English and Lithuanian for the section, the switch and the four error codes.

## Tests

- **Unit:**
  - token parsing: the wrong prefix, a missing part and a bad base64url secret;
  - `TokenReadableTests` in `JxFinance.Tests/Architecture`: every `TokenReadable` endpoint is `GET`, and no endpoint of Auth, Users, Settings, Backups, Notifications, Trash, Imports or Attachments carries the metadata;
  - `SecretRedactionTests`, which already covers the new records.
- **Integration:**
  - Tokens: create answers the secret once and the list never shows it; a wrong password answers `password.incorrect` and counts; the eleventh token answers 409.
  - Reading: a token reads the same transactions as its owner's cookie, with and without `X-Active-Household`; the CSV export works with `activeHousehold`.
  - Refusals: a `POST` with a token answers 403 `token.notAllowed`, and so does an administrator's token on `GET /api/backups/{id}/download` and on `GET /api/auth/sessions`.
  - Ending a token: expired, revoked and foreign-prefix tokens answer 401; deactivation and an administrator reset delete the tokens; switching the feature off answers 403 `feature.disabled` and switching it back on revives them.
  - Limits and logging: the 61st request in a minute answers 429 with `Retry-After`; `LastUsedAt` moves at most once a minute under the fake clock; a request with both a token and a cookie is the token's user and cannot reach cookie-only routes.

## Docs

- New `docs/features/personal-api-tokens.md`, and a row in `docs/features/README.md`. The page holds:
  - the rules above in short form;
  - the list of readable groups;
  - the scripting examples:
    - curl with `--cacert` pointing at Caddy's root certificate;
    - PowerShell 5.1 `Invoke-RestMethod -Headers @{ Authorization = "Bearer $env:JX_TOKEN" }`;
    - Python `requests` with `verify=` set to the root certificate;
    - Excel Power Query `Web.Contents(url, [Headers = [Authorization = "Bearer " & token]])`, with the warning that the workbook then contains the token;
  - paging through `page` and `pageSize` (at most 200);
  - that decimal amounts arrive as strings.
- Updates to:
  - `docs/architecture/authentication.md`: the second scheme, the policy scheme, the gate and the limiter;
  - `docs/decisions/authentication.md`: the entries above, dated;
  - `docs/api.md`: the `Authorization` header section beside `X-Active-Household`;
  - `docs/features/installation-settings.md`: the switch;
  - `docs/features/user-management.md`: tokens end on deactivation and on an administrator reset;
  - `docs/features/backup-and-restore.md`: tokens travel;
  - `docs/data-model.md`, `docs/scope.md` and `docs/backlog.md`.

## Open questions

- Should deactivating a user delete their tokens, as planned, or only suspend them so that reactivation brings them back? Deleting is safer; suspending is kinder to scripts after a temporary deactivation.
- Should attachment files be readable with a token, for a script that archives receipts? The plan leaves the Attachments group out.
