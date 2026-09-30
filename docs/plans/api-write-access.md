# Plan: Write access for personal API tokens

Status: planned 2026-09-30, reviewed against the code the same day. Size M for part 1; part 2, a read-only MCP server, is S and gated on the owner asking for it. Part 1 adds an access level to personal API tokens, so a token can also record transactions, transfers and recurring confirmations from a script, Home Assistant or an iOS Shortcut. It reopens the "read-only tokens" decision of 2026-09-29 in `docs/decisions/authentication.md`, which already named a column with a default as the way write access would come. Build after nothing.

## Outcome

- In Settings › Personal › Security, **Create token** gains **Access**: *Read only* (the default, as today) or *Read and write*. A read-and-write token can live 30 or 90 days, and the password is confirmed as before.
- The token list shows each token's access as a badge. An existing token stays read-only.
- **What a read-and-write token can do:**
  - create, edit and delete a transaction,
  - set the category or tags of many transactions at once,
  - create, edit and delete a transfer,
  - confirm a recurring entry.
  Everything else still answers `403 token.notAllowed`. That includes imports, attachments, receipts, the trash, settings, users, households, backups, and categories, rules and budgets.
- **Retries.** A client can send `Idempotency-Key: <1 to 64 visible characters>` with a POST. Sending the same request again with the same key within 24 hours returns the first answer instead of recording a second row. A Shortcut that retries on a bad connection never books a coffee twice.
- **Marks.** The edit dialog of a transaction created through a token says "Added through the API". The household activity log names the token: "Justas, through Home Assistant, added Maxima, 12.40 EUR".
- **Bank imports.** An API-created row is matched by a later bank import like a hand-entered row, so the coffee is not imported a second time.
- **Docs.** `docs/features/personal-api-tokens.md` gains write examples for curl, PowerShell 5.1, Python, an iOS Shortcut and a Home Assistant `rest_command`.

Part 2, gated:

- `tools/jx-mcp` is a small stdio MCP server run on the member's own computer with a token. It exposes readable routes as tools to an AI client the member chooses, and only ever sends `GET` requests.
- The installation still sends nothing anywhere; whatever the member's AI client does with the answers is the member's choice.
- It is built only if the owner asks for it, because it invites sending ledger data to a hosted model, which the product otherwise avoids.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Access model | `PersonalApiToken.Access`, an enum `TokenAccess` of `Read` or `ReadWrite`, default `Read`, in `Infrastructure/Auth` next to the entity | Fine-grained scopes per resource; a separate token type | Two levels answer every use named so far. The 2026-09-29 decision already chose "a column with a default" for this step. Per-resource scopes can replace the enum later without changing the gate's shape |
| What a write token reaches | An allowlist marked on each endpoint with `TokenWritable.Yes`, checked by an architecture test listing the exact routes, like `TokenReadable` | Every non-admin write; a denylist | An allowlist cannot forget a new route the way a denylist can, the argument that chose `TokenReadable`. The list is the rows a script records. Structure (categories, rules, budgets) and documents (attachments, receipts) stay browser-only, so a leaked token can add noise but cannot reshape the books or read files |
| Lifetime | 30 or 90 days for read-and-write; 30, 90 or 365 for read | The same choices for both | A token that writes is worth more to a thief; a shorter ceiling bounds the damage without a new mechanism |
| Duplicate submissions | An `Idempotency-Key` header on token POSTs, remembered for 24 hours in `ApiIdempotencyKeys` per token and key, with a hash of the request and the stored answer | An `externalRef` field on transactions; no protection | A header works for every allowed POST without changing request bodies. Scripts and Shortcuts retry, and a household ledger must not double count. Reusing `ImportRef` would mix API rows into the import's duplicate rules |
| Claiming a key | The middleware inserts the claim row and commits it at once, in its own short transaction, before the endpoint runs. It stores the answer in a second short transaction after the endpoint returns. A claim without an answer older than 60 seconds may be taken over | One transaction around the endpoint | Services open their own transactions on the scoped `AppDbContext` (for example `RecurringBillService.ConfirmAsync`), which would collide with an outer one. The takeover rule keeps a crashed request from blocking its key for a day |
| Conflicts | A reused key with a different request answers `409 idempotency.keyReused`. A key whose first request is still running answers the existing `409 conflict.busy` | 422 for the reused key; a new "in progress" code | `ErrorCodes.StatusCodeFor` has no 422 anywhere, and every conflict in the API is a 409. `conflict.busy` already means "try again in a moment" |
| Attribution | `TransactionSource.Api`, and `AuditEvent.ViaToken`: the token's name when the event was written | No trace beyond the request log | The 2026-09-29 decision left tokens out of the activity log because they only read. A write is exactly what the log is for, and a member should see whether a row came from them or from their automation |
| Bank import matching | The import's matching of hand-entered rows (`ImportPreviewService`, `ImportConfirmService`) considers `Source != Imported` instead of `Source == Manual`. Linking still rewrites the source to `Imported`, as it does for a hand-entered row. The month-close checklist keeps counting only `Imported` rows as "latest imported date" | Leaving matching on `Manual` only | Otherwise the Shortcut's coffee would be imported again from the bank statement. Once the bank has confirmed a row, the bank is its record, exactly as for a typed row. The activity log keeps the token's name for the create |
| CSRF | Unchanged: bearer requests ignore cookies, and the gate acts only on `Bearer jxp_…` | Antiforgery for token writes | A browser never adds `Authorization` to a cross-site request, there is no CORS policy and the session cookies are `SameSite=Strict` (`docs/architecture/authentication.md`) |
| Rate | The existing 60 requests a minute per token, shared by reads and writes | A second, smaller write budget | 60 writes a minute is already far above any household automation, and one limiter keeps the middleware as it is |
| API reference | The contract describes the writable operations under the `PersonalApiToken` scheme too; the docs page lists them with examples. No reference page is served by a deployed installation | Serving Scalar in production | `docs/decisions/development.md` keeps a deployed installation from describing its API to anyone who reaches it |
| Webhooks | Not planned | Outbound webhooks on new transactions | Discord already carries notifications out. A webhook to an arbitrary URL is an SSRF surface the Discord allowlist exists to avoid |
| Goals | Not writable in this version | Adding `PUT /api/goals/{id}` | A goal's update needs the whole goal, which a script should not have to hold. A small progress endpoint can join the list when an automation needs it |

## Data model

| Change | Detail |
| --- | --- |
| `PersonalApiToken.Access` | `TokenAccess` enum stored as text, not null, default `Read` |
| `TransactionSource.Api` | Appended to the enum |
| `AuditEvent.ViaToken` | `string?`, at most 60 characters (the token name's limit) |
| `ApiIdempotencyKey` | `TokenId` (FK, cascade delete), `Key` (1 to 64), `RequestHash` (64 hex characters), `StatusCode` (`int?`, null while running), `Body` (`jsonb`, null while running), `Location` (`string?`), `CreatedAt`; primary key `(TokenId, Key)` |
| Migration | `just migrate-add AddTokenWriteAccess` |

`ApiIdempotencyKeys` is transient, like `UserSessions`:
- `BackupDatabase.ReadShapes` adds it to its `transient` array.
- `UserExportTables` classifies it as `new Excluded("Retry keys of API tokens")`, so the classification test passes.
- `MemberImport` does not import it.
- `Retention` gains `PruneIdempotencyKeysAsync`, next to `PruneApiTokensAsync`, which deletes rows older than 24 hours.

## Backend steps

1. **Metadata.** `Common/TokenWritable.cs`, the twin of `TokenReadable`, with `Yes` and `Allows(metadata)`. These endpoints add `Options(b => b.WithMetadata(TokenWritable.Yes))`, as `GetBrokerConnectionsEndpoint` adds its token metadata:
   - `CreateTransactionEndpoint`, `UpdateTransactionEndpoint`, `DeleteTransactionEndpoint`,
   - `BulkCategorizeTransactionsEndpoint`, `BulkTagTransactionsEndpoint`,
   - `CreateTransferEndpoint`, `UpdateTransferEndpoint`, `DeleteTransferEndpoint`,
   - `ConfirmRecurringBillEndpoint`.
2. **Claims.**
   - `AuthClaims` gains `TokenName = "jx.token.name"` and `TokenAccess = "jx.access"`.
   - `PersonalApiTokenAuthenticationHandler`'s query also selects `Name` and `Access`, and the principal carries both.
   - `ICurrentUser` gains `string? TokenName => null` as a default member, like `ActiveHouseholdId`, so `FixedUser` and `JobUser` keep compiling. `HttpCurrentUser` reads the claim.
3. **Gate.** `PersonalApiTokenGateMiddleware`:
   - A GET keeps today's rule and message.
   - Any other method passes only when the `jx.access` claim is `ReadWrite` and `TokenWritable.Allows(metadata)`. Otherwise it answers `token.notAllowed` with one of two messages:
     - "This token can only read; create a read-and-write token to record entries." (read token, writable route)
     - "API tokens cannot use this route; it needs a browser session." (route not writable)
4. **Idempotency.** `Common/Middleware/IdempotencyMiddleware.cs`, registered after `ActiveHouseholdMiddleware` and before FastEndpoints in `ApiPipelineExtensions`. It acts only on token POSTs that carry the header.
   - The request hash is the SHA-256 of the method, path, query, `X-Active-Household` and body. The body is buffered with `EnableBuffering`.
   - **First request:** it inserts the claim in its own transaction, swaps `Response.Body` for a buffer, runs the endpoint, then stores the status, body and `Location` in a second transaction and copies the buffer out.
   - **Repeat with the same hash and a stored answer:** it replays the answer with `Idempotency-Replayed: true`.
   - **Repeat with a different hash:** `409 idempotency.keyReused`.
   - **Repeat while the first has no answer and is younger than 60 seconds:** `409 conflict.busy`. An older claim is taken over.
   - Answers of 500 and above delete the claim, so a retry runs again.
   - A key longer than 64 characters or with control characters answers `text.tooLong` or `idempotency.keyReused`'s sibling rule, the existing `format.invalid`.
5. **Source and audit.**
   - `TransactionService.CreateAsync` sets `Source = Api` when `ICurrentUser.TokenName` is set.
   - `AppDbContext` passes `ICurrentUser.TokenName` into `new AuditCollector(this, actorId, tokenName, now)`, and `NewEvent` writes `ViaToken`. That also covers the bulk `Summarised` events.
   - `AuditEventResponse` and its mapper gain `ViaToken`.
6. **Import matching.** `ImportPreviewService` and `ImportConfirmService` match hand-entered rows with `Source != TransactionSource.Imported`.
7. **Tokens.**
   - `CreatePersonalApiTokenRequest` gains `Access`.
   - `CreatePersonalApiTokenValidator` adds `IsKnownEnum` on `Access`, and "`ExpiresInDays` at most 90 when `Access` is `ReadWrite`", answering `range.invalid`.
   - `PersonalApiTokenResponse` gains `Access`.
8. **Contract.** `Common/OpenApi/TokenSecurity` gains `MarkWritable`, registered in `OpenApiExtensions` beside `MarkReadable`, so writable operations list the `PersonalApiToken` scheme. The scheme's description drops "Read-only". Run `just gen`.
9. **Error code.** `idempotency.keyReused` in `ErrorCodes.cs`, added to the 409 list in `StatusCodeFor`, with English and Lithuanian text.

## Frontend steps

1. `just gen`. The token mutations are already in `src/api/invalidation.ts`, and no new mutation is added.
2. **Token form.** `features/profile/api-tokens-section/api-tokens-section.tsx`:
   - `CreateTokenForm` gains an Access `SegmentedControl`. Its `onChange` handler limits the expiry options to 30 and 90, and moves a chosen 365 to 90 there, not in an effect.
   - `TokenRow` shows the access badge.
   - `CreatedToken` repeats what the token can do in one sentence.
3. **Transaction mark.** `features/transactions/source-mark/source-mark.tsx` shows "Added through the API" under the title of the transaction edit dialog when `source` is `api`. Nothing shows for manual or imported rows, as today.
4. **Activity.** `features/households/household-activity/household-activity.tsx` builds the actor with `audit.actorViaToken` ("{{actor}}, through {{token}}") when `viaToken` is set.
5. **Text.** English and Lithuanian keys:
   - `profile.apiTokens.access.label`, `.read`, `.readWrite`, `.badgeRead`, `.badgeReadWrite` and `.readWriteSummary`,
   - `transactions.sourceApi` and `audit.actorViaToken`,
   - `serverErrors.idempotency.keyReused`.
6. **Stories.**
   - The tokens section adds a read-and-write row, and the form with Read and write chosen, with a `play` that checks the expiry options shrink and 365 moves to 90.
   - `source-mark` has its own story.
   - The activity story adds an event with `viaToken`.

## Part 2: read-only MCP server

Build it only when the owner asks for it.

1. `tools/jx-mcp/` is a Node package on the official MCP TypeScript SDK, with its own `package.json`, outside the frontend build. It reads `JX_URL` and `JX_TOKEN` and only ever sends `GET` requests, so even a read-and-write token given to it cannot write. The docs still tell the member to give it a read-only token.
2. Its tools map one-to-one to readable routes: accounts, transactions with the ledger filter, the report summary, budgets, goals, net worth and recurring entries. Each tool's description comes from the contract's summaries.
3. A unit test runs each tool against a recorded response. `docs/features/personal-api-tokens.md` gains an MCP section that says plainly that the member's AI client, not the installation, decides where the answers go.

## Tests

- **Architecture:** `TokenWritableTests`, built on `FastEndpointsPipeline` like `TokenReadableTests`:
  - It lists the exact writable routes.
  - It checks that no route under `NeverReadablePrefixes`, `categories`, `budgets` or `households` carries `TokenWritable`.
- **Integration:**
  - **Allowed and refused writes:**
    - A read token gets `token.notAllowed` on `POST /api/transactions`.
    - A read-and-write token creates, edits and deletes a transaction and a transfer, bulk-categorizes, and confirms a recurring entry.
    - It gets `token.notAllowed` on `POST /api/categories`, on attachment upload and on import confirm.
  - **Idempotency:**
    - The same key and request return the first answer with `Idempotency-Replayed`, leaving one row.
    - The same key with another body, or another active household, gives `idempotency.keyReused`.
    - A concurrent duplicate gives `conflict.busy`.
    - A claim older than 60 seconds is taken over.
    - A 500 is not stored.
    - Keys are per token.
    - The retention job removes day-old keys.
  - **Attribution:**
    - A created transaction has `Source = Api`.
    - A write on a shared account writes an audit event with `ViaToken`, including a bulk categorization's summarised event.
  - **Import:** a bank import matches an API-created row within three days and links it, instead of importing it again.
  - **Tokens:**
    - A read-and-write token with 365 days is refused with `range.invalid`.
    - Deactivation, a password reset and `--recover-admin` still delete write tokens.
  - **Visibility:** under `X-Active-Household`, a write naming an account outside that household answers `reference.notFound`.
  - **Recurring entries:** confirming a recurring entry that pays a debt through a token links the debt payment as it does in the browser.
- **Unit:** the gate's decision table, and the idempotency hash over method, path, query, household header and body.

## Docs

- `docs/features/personal-api-tokens.md`: Access, the writable routes, `Idempotency-Key`, the lifetime rule, the ledger mark and the activity phrase.
  - Write examples for curl, PowerShell 5.1, Python, an iOS Shortcut and a Home Assistant `rest_command`, with the certificate-trust note for scripts.
  - One line each on three consequences:
    - a row a token deletes lands in the Trash, restored in the browser;
    - a confirmation that pays a debt links it;
    - a partner can split an API-created expense on a shared account.
- `docs/decisions/authentication.md`: a Log entry reopening the read-only decision, with the rejected alternatives above. Update the Current section.
- `docs/architecture/authentication.md`: the gate's write rule and the idempotency middleware's place in the pipeline.
- `docs/features/bank-statement-import.md`: API rows are matched like hand-entered ones.
- `docs/features/audit-log.md`, `docs/features/data-export-per-user.md` (older exports cannot be imported after the migration), `docs/data-model.md`, `docs/api.md` (the new code and the header) and `docs/scope.md`.

## What must be true to ship

1. `TokenWritableTests` and `TokenReadableTests` pass, and no write route outside the list accepts a token.
2. A Home Assistant `rest_command` and an iOS Shortcut, each retried with the same key, record exactly one transaction on the production overlay.

## Open questions

None.
