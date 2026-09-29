# Plan: Data export per user

Status: planned 2026-09-28. Size M. Independent of the other plans. [Personal API tokens](../features/personal-api-tokens.md), shipped on 2026-09-29, must stay unable to reach this route (`UsersGroup` is not token-readable, and `TokenReadableTests` pins the readable routes), and [Household settle-up](household-settle-up.md) adds tables that the ownership list below has to classify when either lands second.

## Outcome

- In Settings › Personal › Import data, renamed "Import and export", a member presses "Download my data". An optional "Include attached files" checkbox is off by default. The browser saves `jx-finance-export-<date>.zip` without an administrator being involved, and nothing is left on the server.
- The archive holds:
  - `data.json`: every record the member owns, in the backup's table format, with a header naming the member, the date and the migration;
  - `transactions.csv`, `transfers.csv` and `accounts.csv`: the member's own accounts and what is on them, readable in a spreadsheet;
  - `attachments/<id>`: the files attached to transactions on the member's accounts, only when asked for.
- The export ignores the household switcher. It answers "what is mine", not "what am I looking at".
- It can be taken three times an hour, and one at a time per member.

## Today

- The only way out of the installation for everything is the administrator's backup: every table, including other members' data, password hashes and two-factor secrets.
- A member can download the transaction CSV and PDF of the current screen, which follow the active household and the filters. That is the visible scope, not the member's own records, and it has no transfers, budgets, goals or anything else.
- `BackupService` already writes tables generically: `BackupDatabase.ReadShapes` gives the tables and columns from the EF model, each value is read as `column::text`, and `BackupReader` reads that format back while streaming.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| What "their own" means | Four kinds of row are included. (1) Every row the member owns (`UserId` is the member): accounts (personal, shared and archived), categories, tags, categorization rules and their tags, budgets, goals, assets and their valuations, debts and debt payments, recurring entries, subscription dismissals, notifications, net-worth snapshots, month closes, trash entries and their changes. (2) Everything on the member's own accounts, whoever entered it: transactions with their lines, tags and attachment rows, conversions, investment entries and transfer receipts. (3) Every transfer with one side on the member's accounts. (4) Rows the member does not own but that their rows point at: a housemate's shared category or tag used on one of their transactions, and the securities of their investment entries | Everything the member can see; only what the member created | "Everything visible" would take the history of a partner's shared accounts, which is the household's and is what the administrator's backup is for. "What I created" would split one account's history between two files, and would leave out of the member's own account what their partner entered on it. The referenced rows are few and already visible to the member, and without them the ids in the file would mean nothing |
| What is never included | The password hash, security stamp, concurrency stamp, authenticator key and recovery codes (`AspNetUserTokens`); sessions, passkeys and API tokens; households, memberships and the activity log; other members' accounts and what is on them, including rows the member entered there; the broker's Flex token and the Discord webhook URL; the email and Discord outboxes; installation settings; exchange rates | Including the encrypted secrets, as the backup does | An encrypted secret is unreadable on any other installation and useless to a person. Household-level rows belong to all members, not to one |
| Format of `data.json` | The backup's table format, `{ format, version, createdAt, migration, tables: [{ name, columns, rows }] }`, with `format` set to `jx-finance-user-export`, `version` 1 and a `userId` in the header. Each table carries only the member's rows and only the allowed columns. Soft-deleted rows are included with their `IsDeleted` column | API response shapes; a restorable backup | Response records carry computed values (balances, progress) and there are dozens of them. A table dump covers a new entity the day it is mapped, and `BackupReader` can read it, so a later "import a member's export" is a visitor rather than a new parser. A backup restore truncates the whole installation, so it cannot take a partial file |
| Re-import | Not in v1. The ids are GUIDs and the ownership column is explicit, so a later importer can rewrite `UserId` and insert. The feature page says the file is not yet re-importable | Shipping an importer now | Nobody has asked to move a member between installations, and an importer has to decide what to do with references to rows it does not have |
| CSV | `transactions.csv` uses exactly the columns of the transaction export (`Date,Description,Account,Category,Tags,Type,Amount,Currency`), through the same writer, moved from `ExportTransactionsEndpoint` into `Endpoints/Transactions/Shared/TransactionCsvWriter`. `transfers.csv` has `Date,Description,FromAccount,ToAccount,Amount,Currency,ReceivedAmount,ReceivedCurrency`. `accounts.csv` has `Name,Type,Currency,StartingBalance,Scope,Archived`. The CSVs hold live rows on live accounts, what the ledger would show, and use the leading-quote guard of `Common/CsvCell` | A CSV for every table | The CSVs are for reading in a spreadsheet, and the three cover what people read there. Everything else is in `data.json` |
| Attachments | Optional and off by default, stored uncompressed as `attachments/<id>` like the backup. File names are in the `TransactionAttachments` rows. A row whose file is missing is left out and counted in the header as `missingAttachments` | Always included; never included | Attachments can make the archive large, with up to ten files of 10 MB per transaction, while most exports are for the numbers. Receipts are still the member's own data, so they have to be available |
| Generation | Synchronous and streamed into the response as a zip through .NET 10's async `ZipArchive.CreateAsync` and `ZipArchiveEntry.OpenAsync`, so Kestrel's ban on synchronous IO holds. The rows are read in one `REPEATABLE READ` transaction, so the file is one snapshot. The transaction is committed before the attachment files are copied | A background job that writes a file and notifies with a download link | A job would keep a copy of personal data on the server, and would need a table, an expiry, a sweep, a notification and a second authorized download route. Personal-scale data streams in seconds, and the backup already proved that streaming `column::text` is cheap |
| Size | No row cap, because rows are streamed. There is no archive cap either: the attachments are the member's own and are bounded by the attachment rules | A size cap | A cap would refuse exactly the member with the most history. Memory use is one buffer and one row |
| Download | A plain `<a href>` `GET`, so the browser streams the file to disk as it does the transaction CSV | `fetchFile` into a blob | A blob holds the whole archive in the tab's memory, which a large archive with attachments can be |
| Password | Not asked | Confirming the password as a restore does | The signed-in session can already read every one of these records through the API and the CSV export, so a password would protect nothing new. It would also force a `POST` and a blob download |
| Rate limit | `Throttle(3, 3600)` per client. `pg_try_advisory_xact_lock` on the member's id refuses a second concurrent export with 409 `conflict.busy` | No limit | An export reads every owned table, and three an hour is plenty for a person |
| Scope | Unscoped by construction: the service reads through the SQL table dump and through `AppDbContext.For(services, userId)`, whose `FixedUser` has no active household | Following the switcher, as the transaction export does | Ownership does not change with the view. An own account shared into a household other than the active one would otherwise go missing |
| Tokens and administrators | The route is in `UsersGroup`, which is not token-readable. An administrator exports only their own data; another member's data leaves only through the backup | An administrator exporting any member | The backup already covers the administrator's case. A per-member export for someone else would be a new privacy decision |
| Audit and trace | Nothing is written to the household activity log, because nothing shared changes. The request is logged like every other download | A notification that "your data was downloaded" | See the open question |

## Data model

None. The new code is a list, not a table.

## Backend steps

1. **Ownership list.** `Endpoints/Users/Services/UserExportTables` classifies every table of the EF model:
   - `Owned` (`"UserId" = @user`);
   - `OnOwnedAccounts(column)` (`… IN (SELECT "Id" FROM "Accounts" WHERE "UserId" = @user)`);
   - `Transfers`;
   - `ChildOf(parent, column)` for plain join and line tables;
   - `Referenced`: categories and tags used by exported transactions and lines, and securities used by exported investment entries;
   - `UserRow`: `AspNetUsers` limited to `Id`, `Email`, `UserName`, `DisplayName`, `EmailConfirmed`, `EmailNotificationTypes` and `DashboardLayout`;
   - `Excluded(reason)`.

   Excluded columns are listed per table, such as the broker token column. Predicates are built only from quoted identifiers and one `@user` parameter.
2. **Row writer.** Move `BackupService.WriteRowsAsync` into `BackupDatabase`, with an optional predicate and a column subset, so the backup and the export share one reader of `column::text`. The backup's behaviour does not change.
3. **Service.** `IUserExportService` and `UserExportService` in `Endpoints/Users/Services`. `WriteAsync(Stream output, bool attachments, ct)`:
   - opens `ZipArchive.CreateAsync` on the response body;
   - takes the try-lock inside a `REPEATABLE READ` transaction;
   - when attachments are asked for, first reads the exported attachment ids and checks their files in `AttachmentStore`, so the header can carry `missingAttachments`;
   - writes `data.json`;
   - writes the three CSVs from queries on `AppDbContext.For(services, userId)`, with account, category and tag names loaded once as `ExportNames` does;
   - commits, then copies the files.
4. **Endpoint.** `Endpoints/Users/ExportMyData`: `GET /api/users/me/export?attachments=false`. It is declared with the zip content type and 409 and 429 in `Description`, `Throttle(3, 3600)`, and `Content-Disposition` with the file name. There is no `Content-Length`, as with the CSV export.
5. **Error codes:** none new; `conflict.busy` is reused.

## Frontend steps

1. `just gen`. It is a `GET` with no mutation, so no invalidation rule is needed.
2. **Section.** `features/profile/export-data-panel`, rendered below `ImportDataSection` in the `import` section of `profile-page.tsx`. It has two sentences on what is and is not included, the "Include attached files" checkbox in local state, and a download button that is a plain link to the export URL. The section title changes from "Import data" to "Import and export" in both locales, and the command palette entry follows.
3. **Stories:** the default state and the checkbox, with a `play` that checks the link's `href` gains `attachments=true`.

## Tests

- **Unit:**
  - `UserExportTablesTests` fails when a table of the model is unclassified, in the way `ShareableSetTests` fails on a missing shareable set;
  - no exported column is named like a secret, using the same pattern as `SecretRedactionTests`: `PasswordHash`, `SecurityStamp`, `Token`, `Secret`, `Webhook` and so on.
- **Integration:**
  - Contents: an owner's export holds their personal and shared accounts, an archived account, a transaction their partner entered on their shared account, and a transfer to the partner's account. It does not hold the partner's accounts or the rows the owner entered there.
  - Referenced rows: a housemate's shared category used on one of the owner's transactions is present; nobody else's budgets or goals are.
  - Scope: the export is identical with and without `X-Active-Household`.
  - Readability: `data.json` parses with `BackupReader`, and each CSV parses with the documented header.
  - Attachments: with the flag the files are present and their SHA-256 matches the rows; a missing file is counted.
  - Limits: a second concurrent export answers 409; the fourth in an hour answers 429.
  - Refusals: a personal API token gets 403 `token.notAllowed`.

## Docs

- New `docs/features/data-export-per-user.md`, and a row in `docs/features/README.md`. The page covers:
  - the four kinds of included rows and the never-included list, as a table;
  - the file layout;
  - that the file is not yet re-importable;
  - how it differs from a backup.
- Updates to:
  - `docs/features/exports.md`: a section pointing at the new page;
  - `docs/decisions/exports.md`: the entries above, dated;
  - `docs/architecture/backup-and-restore.md`: the shared row writer, and that the member export reuses the table format under another `format` value;
  - `docs/features/households-and-sharing.md`: the export ignores the switcher;
  - `docs/api.md`, `docs/scope.md` and `docs/backlog.md`.

## Open questions

- Should a member be able to import this file into another installation later? If so, the format becomes a public contract and a change to it needs a version bump, which should be decided before the first file leaves an installation.
- Should an export leave a notification for the member ("Your data was downloaded on …")? It is the only trace a member would see if a stolen session took their data, at the cost of one more notification kind.
