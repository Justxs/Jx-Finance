# Plan: Reconciliation by hand

Status: planned 2026-09-28. Size M. Build it after [Match imports to hand-entered rows](import-manual-entry-matching.md), which changes the same `ImportService.ConfirmAsync` and statement bar. Build it before [Monthly digest](monthly-digest.md), which counts the accounts that are not reconciled among the open items.

## Outcome

- Every row on the accounts page gets a "Reconcile" action. It opens a dialog asking for the statement's date (by default the last day of the previous month, never after today) and the balance printed on the statement.
- As the user types, the dialog shows:
  - the ledger balance on that date;
  - the difference ("Matches the statement", or "€12.30 more on the statement");
  - the rows on that account dated after the previous reconciliation and up to the date, with a link to the ledger for that range.
- Save records the reconciliation even when there is a difference.
- The same dialog lists the account's earlier reconciliations with today's difference for each, and one can be deleted.
- A camt.053 import records its closing balance as a reconciliation by itself, so an account that has camt.053 needs nothing typed.
- The month-close checklist has one line per account that has either kind of evidence:
  - "Swedbank reconciled on 31 Aug";
  - "Revolut: the statement differs by €12.30 on 31 Aug";
  - "Swedbank imported through 31 Aug";
  - "Swedbank: last import 20 Aug, before the month ends".

  A line that differs or is behind carries a "Reconcile" link, which opens the dialog on the accounts page.

How the month close decides this today: `MonthCloseService.ChecklistAsync` answers `checklist.imports`, the date of the latest imported row per account, and the client calls an account covered when that date is on or after the month's last day. The camt.053 closing balance is compared with the ledger only in the import preview (`ImportStatementSummary.LedgerBalanceAtClose`) and is thrown away after the import. The close therefore never knows whether a balance agreed. This plan stores both kinds of evidence in one table and makes the checklist read it.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| One record for both sources | `AccountReconciliation` rows with a `Source` of `Manual` or `Statement`. The camt.053 confirm writes one, and the dialog writes one. The checklist reads these rows first and the import date second | A reconciled flag on `MonthClose`; parsing stored statement files again | One table makes a camt.053 closing balance and a typed balance the same evidence, read by one query. A flag on the close would be personal and per scope, while a statement is a fact about the account |
| Live difference | Only the statement's balance is stored. The ledger balance and the difference are computed on every read through `AccountMovements` | Storing the ledger balance or a "matched" flag at save | An edit dated before the statement date changes the ledger balance later. A stored "matched" would then be false, which is the same reason balances are never stored |
| Currency | The account's main currency only | One reconciliation per held currency | The camt.053 check has the same rule, and a bank statement covers one currency. See open questions |
| Import echo | `ImportConfirmRequest` carries the preview's `closingDate`, `closingBalance` and `closingCurrency`. The server records them only for camt.053 when the currency is the account's, after the rows are written, in the same transaction | Sending the file again at confirm; recording only a matching balance | The file is not uploaded twice. The user could type the same number in the dialog, so trusting the echo adds no risk. A balance that does not match is the useful case to keep |
| One per date | Unique on (`AccountId`, `Date`). Saving again on a date replaces the balance and the source | Keeping every attempt | The latest balance typed for a date is the statement. Replacing needs no conflict code |
| Which one counts for a month | The earliest reconciliation dated on or after the month's last day: `Reconciled` when the difference is zero, `Differs` otherwise. With none, the latest import on or after the month's last day gives `Imported`. Otherwise the account is `Behind` | Only a reconciliation dated exactly on the last day | Banks end statements on different days. A balance that agrees after the month end means the month's rows are all in, barring errors that cancel out |
| Hint, not a block | `Differs` and `Behind` count toward "N things need attention", not toward the "Close with open items?" confirmation | Refusing to close | This is the rule the import hint follows today, for the same reason: it is a hint about the statement, not a row to fix |
| Visibility | `IAccountScoped`: whoever can see the account can list, add and delete its reconciliations, and the owner column records who typed it | Owner only | A statement is a fact about a shared account, and either partner may be the one holding it |
| Deleting | A hard delete, no trash entry, not audited | A trash entry and an audit event | It moves no money and can be typed again in seconds. `MonthClose` made the same choice when it is reopened |
| Switch | None. Recording on import needs `Import` on anyway | A feature switch | It runs no job and raises no notification |
| Accounts table | No new column | A "Reconciled" column | It would cost a balance query per account on every list, and the checklist asks the question once a month |

## Data model

| Change | Detail |
| --- | --- |
| New `AccountReconciliation` (`OwnableEntity`, `IAccountScoped`, id `AccountReconciliationId`) | `AccountId` (restricting foreign key), `Date`, `Balance` (`Money`, the account's main currency at save) and `Source` (`Manual` = 0, `Statement` = 1). Unique index on (`AccountId`, `Date`). Deleted with `ExecuteDeleteAsync`, never soft-deleted. The account filter hides the rows of an archived account together with the account |
| Migration | `just migrate-add AddAccountReconciliations` |
| Backup | An ordinary exported table. Add a round trip to `BackupEndpointTests` |

## Backend steps

1. **The ledger balance on a date.** Add `AccountMovements.LedgerBalanceOnAsync(db, accountId, startingBalance, date, ct)`: the starting balance plus every movement in the account's currency dated on or before `date`. `ImportService.PreviewAsync` calls it instead of its inline sum, so the preview and the dialog cannot disagree.
2. **Rows in a range.** Add `AccountMovements.ListAsync(db, accountId, currency, after, until, limit, ct)`. Its own union of the five sources answers `AccountMovementRow(AccountMovementKind Kind, Guid Id, DateOnly Date, string? Description, decimal Amount)` with the signed amount, newest first, plus the total count.
   - `Kind` is `Transaction`, `TransferOut`, `TransferIn`, `Conversion` or `InvestmentEntry`.
   - `SumAsync` keeps its single statement, as `AccountMovementsTests` requires.
3. **Entity and migration**, as in the data model above.
4. **Service.** `IReconciliationService`, implemented in `Endpoints/Accounts/Services/ReconciliationService.cs`:
   - `PreviewAsync(accountId, date)`, `ListAsync(accountId)`, `RecordAsync(accountId, date, balance, source)` and `DeleteAsync(accountId, reconciliationId)`;
   - `CoverageAsync(DateOnly monthEnd)` for the checklist.

   It finds the account through `db.Accounts`, so visibility and the active household apply, and answers 404 `resource.notFound` otherwise. A date after `clock.Today` answers 400 `reconciliation.futureDate`, a new code in `ErrorCodes` with English and Lithuanian text.
5. **Endpoints** in `AccountsGroup`, one slice each:
   - **Preview.** `GET /api/accounts/{id}/reconciliations/preview?date=` answers `ReconciliationPreviewResponse(DateOnly Date, Currency Currency, decimal LedgerBalance, ReconciliationResponse? Previous, IReadOnlyList<AccountMovementRow> Rows, int RowCount)`. `Previous` is the latest reconciliation before `date`. `Rows` are the movements after `Previous.Date`, or from the beginning when there is none, up to `date`, at most 100.
   - **List.** `GET /api/accounts/{id}/reconciliations` answers the newest 24 as `ReconciliationResponse(Guid Id, DateOnly Date, decimal Balance, Currency Currency, ReconciliationSource Source, decimal LedgerBalance, decimal Difference, DateTimeOffset CreatedAt)`.
   - **Record.** `POST /api/accounts/{id}/reconciliations` takes `{ date, balance }` and answers the saved reconciliation. The validator requires the date and a signed money balance.
   - **Delete.** `DELETE /api/accounts/{id}/reconciliations/{reconciliationId}` answers 204, or 404 when it is not there.
6. **Import.** `ImportConfirmRequest` gains an optional `Statement`, an `ImportStatementBalance(DateOnly ClosingDate, decimal ClosingBalance, Currency ClosingCurrency)`. `ConfirmAsync` calls `RecordAsync(..., ReconciliationSource.Statement)` after the rows are written, inside its transaction and account lock, when the format is `Camt053` and the currency is the account's. `ImportConfirmResponse` gains `Reconciliation?`, holding the date and the difference.
7. **Month close.** Replace `MonthChecklist.Imports` and `MonthImportCoverage` with `Accounts` and `MonthAccountCoverage(Guid AccountId, string AccountName, MonthAccountState State, DateOnly? Date, decimal? Difference, Currency Currency)`, where `MonthAccountState` is `Reconciled`, `Differs`, `Imported` or `Behind`.
   - `ChecklistAsync` merges `IReconciliationService.CoverageAsync(window.InclusiveEnd)` with the imported-row query it already has, which still runs only while `Import` is on.
   - An account is listed when it has a reconciliation or, while `Import` is on, an imported row.
   - The list is always present, possibly empty. The rule for choosing the state is a pure `MonthAccountCoverage.StateOf(...)`.

## Frontend steps

1. **Contract.** Run `just gen`.
   - The reconciliation queries are under `/api/accounts`, so every ledger mutation already refreshes them and the differences follow edits.
   - Add a rule for the record and delete mutations that refreshes `getAccountsQueryKey` and `getMonthCloseYearQueryKey`.
   - Add `serverErrors.reconciliation.futureDate` in both locales.
2. **Dialog.** Add `features/accounts/reconcile-dialog/` with `reconcile-dialog.tsx` and `reconcile-form.tsx`.
   - The form has a date field and a balance field validated with `money(t)`, like the account form's starting balance.
   - The preview uses `useReconciliationPreview(id, { date })` keyed on the date. The difference is the typed balance minus `ledgerBalance` in cents (`toCents`), so typing refetches nothing.
   - The rows list says "and N more" past 100 and links to `/transactions` with `accountId`, `dateFrom` and `dateTo`.
   - Earlier reconciliations are listed with their difference, source and a delete button.
3. **Accounts page.** Add a "Reconcile" entry to `AccountsTable`'s row actions. Add `reconcile: optionalParam(z.uuid())` to `accountsSearchSchema`; the page opens the dialog for that account and drops the parameter on close, which is how the checklist link lands there.
4. **Import.** `ImportSection` sends `statement` with the confirm when the preview's statement has a closing balance in the account's currency. The result toast and `ImportResult` say "Balance matches the statement on 31 Aug" or "The statement differs by €12.30".
5. **Checklist.** In `close-checklist.tsx`, replace `importsBehind` with a helper over `checklist.accounts` that picks `Differs` and `Behind`. `attentionCount` counts them, and `openItemCount` is unchanged.
   - Texts: `monthClose.checklist.reconciled`, `.differs`, `.importCovered` and `.importBehind`.
   - Links: "Reconcile" goes to `/accounts?reconcile=<id>` for `Differs` and `Behind`, and "Import" stays beside it for `Behind` while `Import` is on.
6. **Stories.**
   - The dialog: matching, differing, no earlier reconciliation, more than 100 rows, the future-date error, pending and `failWith`.
   - The checklist: the four states.
   - The import result with and without a reconciliation.

## Tests

- **Unit:**
  - `MonthAccountCoverage.StateOf`: the earliest reconciliation on or after the month end wins; a zero difference against one that differs; falling back to the import date; behind.
  - `AccountMovementsTests`: `ListAsync` order and count, with `SumAsync` still one statement.
- **Integration** (`ReconciliationTests` in `Integration/Accounts`):
  - The preview's ledger balance equals the import preview's `ledgerBalanceAtClose` for the same date.
  - Rows after the previous reconciliation only.
  - A later edit dated before the statement date changes the listed difference.
  - Saving twice on a date replaces the balance.
  - A future date answers 400 `reconciliation.futureDate`.
  - A household member can reconcile a shared account, and another household's account answers 404.
  - An archived account's reconciliations are hidden and come back on restore.
  - Delete answers 204, then 404.
  - Rows in the account's other currencies are ignored.
- **Import** (`ImportEndpointTests`): a camt.053 confirm with `statement` records a `Statement` reconciliation, a different currency records none, and a Swedbank CSV confirm records none.
- **Month close** (`MonthCloseTests`): the four states, and the attention count against the confirmation count.
- **Backup:** `BackupEndpointTests` round trip.

## Docs

- A new `docs/features/reconciliation.md`, with a diagram of the two sources feeding the table and the checklist, and a row in `docs/features/README.md`.
- A new `docs/decisions/reconciliation.md` with the rows above, and a row in `docs/decisions/README.md`.
- `docs/features/month-end-close.md`: the review table (`checklist.accounts`), the screens section and the attention count.
- `docs/features/bank-statement-import.md`: the closing balance is now kept, plus the confirm field.
- `docs/features/accounts.md`: the row action and the dialog.
- `docs/data-model.md`: the new table.
- `docs/api.md`: the routes and the contract change of the checklist.
- `docs/backlog.md`: move "Reconciliation by hand" from section 4 to Done.

## Open questions

- Accounts that hold several currencies, such as Revolut, get one statement per currency. Is main-currency-only good enough for now, or should the dialog take a currency?
- Should the dialog's default date be the last day of the previous month, as planned, or today?
