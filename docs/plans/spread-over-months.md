# Plan: Spreading a payment across months

Status: planned 2026-09-30, reviewed against the code the same day. Size M. Adds two columns to `Transaction` and changes every read path that turns transactions into income, expense, category or tag figures. No feature switch, because it is an attribute of a transaction like tags, and a row without it behaves exactly as today. Build after nothing. It interacts with the month-end close's drift detection; see backend step 7.

## Outcome

- In the transaction form, an unsplit expense or income that is not a refund has **Spread over**: Off, 3, 6 or 12 months, or a custom number from 2 to 36. For example, yearly car insurance of €360 paid in January and spread over 12 months counts €30 in each month from January to December.
- The ledger still shows one row on the day it was paid, with a chip "Spread · 12 months". Its tooltip reads "Counts €30.00 a month in reports and budgets, January to December 2026".
- These are unchanged, because they are about the money that moved and when:
  - account balances and reconciliation,
  - the cash-flow forecast,
  - unusual amounts and subscription detection,
  - debt payments,
  - the receipt items report,
  - the ledger's own totals.
- These count each monthly slice in its month:
  - reports (totals, trend, category, tag and payee breakdowns),
  - the year review,
  - the dashboard's summary, trend, category and spending-pace cards,
  - category and tag budgets, including budgets shared with a household, and budget limits from history,
  - the month-end close and the monthly digest.
- Report totals always equal the sum of their categories, because every figure is built from the same slices.
- A category, tag or budget link for March opens the ledger for March **including** the January row that counts there. The chip on that row says how much of it belongs to the period, so the figure still leads to its rows.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Storage | `Transaction.SpreadMonths` (`smallint`, 2 to 36) and `Transaction.SpreadUntil` (the date of the last slice), both null when not spread. `SpreadUntil` is set in `AppDbContext.ApplyEntityRules` from `Date` and `SpreadMonths`, the way `PayeeKey` is set from the description | A `TransactionAllocations` table written on save; computing the end in SQL from `Date` and `SpreadMonths` | The slices follow from the row itself. A table would be one more thing to rewrite on every edit, restore and reporting-currency revaluation, the argument that keeps budgets and holdings uncached (`docs/decisions/budgets.md`). The stored end date makes "does this row reach into the window" a plain indexed comparison for the loader, the ledger and the month close, where `AddMonths` on a column would not translate cleanly |
| Where slices are made | In memory: the aggregate SQL adds `SpreadMonths == null`, and one query loads the spread rows with `Date <= end && SpreadUntil >= start` over the period and the comparison. `SpreadSlices.Of` cuts each into dated slices | Expanding in SQL with `generate_series` | Spread rows are a handful a year. The in-memory cut has the same shape as the split proration in `CategoryAttributionService`, and a pure function is easy to test with theories |
| Slice date and amount | The same day of each following month, clamped to the month's last day. `ReportingAmount` divided into N cent amounts by largest remainder, reusing `Common/SettleUp/ShareAllocator` with `SplitMethod.Equal` and N parts | Slices on the first of each month; slicing by days; rounding each slice and giving the last the remainder | The payment's own day keeps a weekly budget's window meaningful. Largest remainder adds up to the cent and never makes a slice negative, which round-and-remainder does for 0.10 over 12 months |
| Direction | Forward from the payment's month | Backward, as for a bill paid in arrears; centred | Forward covers insurance, yearly subscriptions and services paid in advance. A start offset is an open question below |
| Splits and refunds | Not allowed in the first version | Spreading every split line; spreading a refund as its purchase was | Each would add a second dimension to the cut for a case nobody has asked for yet. A refund of a spread purchase lowers its category in the month the money came back, which is still true |
| Ledger | Whole rows. A date filter keeps rows dated in the range, plus, only when the link came from a figure (`spreadOverlap=true`), spread rows whose slices reach into it | Slicing the ledger summary; never showing the spread row for later months | The ledger answers "which rows match", and its total is a sum of rows, as for tags and splits. The figure-to-rows promise in `docs/features/reports.md` needs the January row to appear under March, and the chip states the part that counts there |
| Payee count | A spread row counts once in every period its slices touch | Counting it only in the month it was paid | The count tells how many rows make up the amount beside it |

## Data model

| Change | Detail |
| --- | --- |
| `Transaction.SpreadMonths` | `short?`, check constraint `"SpreadMonths" IS NULL OR "SpreadMonths" BETWEEN 2 AND 36` |
| `Transaction.SpreadUntil` | `DateOnly?`, null exactly when `SpreadMonths` is null (check constraint) |
| Index | Partial index on `(AccountId, SpreadUntil) WHERE "SpreadMonths" IS NOT NULL`, matching the existing `(AccountId, Date)` indexes |
| Migration | `just migrate-add AddTransactionSpread` |

## Backend steps

1. **Pure cut.** `Common/Spreads/SpreadSlices.cs` has `Of(DateOnly date, decimal amount, int months)`, which returns `IReadOnlyList<(DateOnly Date, decimal Amount)>`; `Until(DateOnly date, int months)`; and `MaxMonths = 36`.
2. **Loader.** `Common/Spreads/SpreadRows.cs` is a static helper like `DatedFlows`. Its `SlicesAsync(this IQueryable<Transaction> visible, DateWindow window, DateWindow? comparison, CancellationToken)` takes the query **before** `Within`, so ownership, the active household, a household predicate and soft delete apply. It reads the spread rows that overlap either window: `Id, Date, Type, CategoryId, ReportingAmount, SpreadMonths, PayeeKey` and their tag ids through the `TransactionTags` navigation. It returns `SpreadSlice(TransactionId Id, DateOnly Date, FlowType Type, CategoryId? CategoryId, string? PayeeKey, IReadOnlyList<TagId> TagIds, decimal Amount)` for the slices inside either window.
3. **Totals and trend.**
   - `Common/DatedFlows.DailyFlowsAsync` becomes `DailyFlowsAsync(this IQueryable<Transaction> visible, DateWindow window, DateWindow? comparison, CancellationToken)`. It applies `Within` and `SpreadMonths == null` itself, then adds the slices.
   - Its four callers pass the unfiltered query and the windows: `ReportService` (line 55), `DashboardService` (lines 32 and 94) and `MonthCloseService` (line 82).
4. **Categories.** Both `GetAttributionsAsync` overloads of `CategoryAttributionService` build their visible query before `Within`, the household overload keeping its account-household predicate. `AttributeAsync` adds `SpreadMonths == null` to the unsplit sum and appends the slices of the requested type as `CategoryAttribution`s. This covers reports, the dashboard breakdown, category budgets (personal and shared), budget suggestions, and through `ReportService`, the month close and the digest.
5. **Tags and payees.**
   - `BudgetUsageCalculator.TagSpendAsync` adds `SpreadMonths == null` and appends the slices carrying each tag.
   - The tag and payee breakdowns in `ReportService` do the same, counting a spread row once per period in the payee `Count`.
6. **Ledger drill-through.**
   - `TransactionFilterRequest` gains `SpreadOverlap` (bool). When it is set with a date range, `TransactionService.Filtered` keeps rows dated in the range **or** spread rows with `Date <= to && SpreadUntil >= from`.
   - `TransactionResponse` gains `SpreadMonths` and `SpreadUntil`.
7. **Month-end close.**
   - `SnapshotAsync` adds the ids of spread rows whose slices land in the month to `RowIds`, but not to `TransactionCount`, which drift compares with the month's own row count.
   - `Changes` gains a clause for spread rows changed after the close whose slice range covers the month. It labels them `Created` or `Edited`, never `MovedOut`.
8. **Validation.** In `TransactionInputValidator`:
   - `SpreadMonths` uses `IsWithin(2, 36)`, which publishes the existing `range.invalid`.
   - With `Lines.Count > 0` it answers the existing `transaction.splitNotAllowed`.
   - On a refund (`Type == Expense && Amount < 0`) it answers a new `transaction.spreadRefund`.
   - The request, mapper and response carry the field.
9. **Revaluation.** `SettingsService.RevalueAsync` rewrites `ReportingAmount` as today. The slices follow because they are computed.
10. **Exports.**
    - `TransactionCsvWriter.Header` gains `Spread months`. This also changes the member export's `transactions.csv`, which uses the same writer, so update the header expectations in `TransactionExportTests` and `TransactionTagEndpointTests`. The member import accepts the new column because it is part of the model.
    - The PDF shows the chip text in the description cell.
11. **Audit.** `SpreadMonths` joins the `Transaction` allowlist in `AuditCollector`.
12. **Error code.** `transaction.spreadRefund` in `ErrorCodes.cs`, with English and Lithuanian text.

## Frontend steps

1. `just gen`.
2. **Form.** `transaction-form.tsx` gets a "Spread over" select under the date. It is hidden for refunds and when the split toggle is on, and choosing Custom shows a number field. `transaction-schema.ts` validates 2 to 36. `transaction-draft.ts` carries the field for duplicate and `refundDraft` drops it. `transaction-views.ts` adds it to `templateSchema` and `templateValuesFromFormValues`.
3. **Ledger.** `features/transactions/spread-mark/spread-mark.tsx` shows the chip and tooltip in the description cell next to `RefundMark`, and in the phone list. When the ledger is filtered by a date range, the tooltip names the part inside the range.
4. **Links.** `components/transactions-link/transactions-link.tsx` adds `spreadOverlap: true` whenever it carries a date range. The ledger's search schema accepts the flag, and the active-filter chips show nothing for it.
5. **Audit.** `features/households/household-activity/activity-sentences.ts` adds `spreadMonths` to `FIELDS`, and the locales gain `audit.fields.spreadMonths`.
6. **Text.** English and Lithuanian for the field, the options, the chip, the tooltips and the error code.
7. **Stories.** `spread-mark` covers 3, 12 and 36 months, with and without a date range. The form story gains the field and a `play` that sets 12 months. The reports fixture gains a spread row, so the report, year-review and budget stories show sliced figures.

## Tests

- **Unit:** `SpreadSlices` theories:
  - the slices sum to the amount,
  - no slice is negative or differs from another by more than a cent,
  - 0.10 over 12 months,
  - 31 January clamps to the end of February in leap and ordinary years,
  - 36 months,
  - `Until` agrees with the last slice.
- **Integration:**
  - **Reports:**
    - A February report counts one slice, and a yearly report counts the whole amount once.
    - Report totals equal the sum of categories.
    - The dashboard trend and the report trend agree.
    - A tag breakdown and a payee breakdown slice, and the payee count counts the row.
  - **Budgets:**
    - Monthly category and tag budgets count one slice.
    - A rollover budget carries correctly across the spread.
    - A household-shared budget counts a housemate's spread row on a shared account.
  - **Unchanged figures:** the ledger summary, the account balance and the forecast do not slice.
  - **Ledger:** `spreadOverlap` brings the January row into a March range, and without it the row stays out.
  - **Validation:** a split or a refund with `SpreadMonths` is refused with the published codes.
  - **Revaluation:** a reporting-currency change revalues the slices.
  - **Month close:**
    - Closing March and then editing the January row marks March changed and lists the row as Edited.
    - A spread row created after the close is listed as Created.
    - March's transaction count does not drift from the spread alone.
  - **Visibility:** the active household narrows the slices, and a spread row restored from the trash brings its slices back.
  - **Member export:** a member export and import round-trip keeps `SpreadMonths`.

## Docs

- `docs/features/transactions.md`: a **Spreading over months** section, including the drill-through flag.
- `docs/architecture/transactions.md`:
  - the aggregates section names `SpreadSlices` beside the split proration,
  - the list of read paths says which slice and which do not.
- One line each on slices in `docs/features/reports.md`, `docs/features/budgets.md`, `docs/features/dashboard.md` and `docs/features/month-end-close.md` (§Drift gains the spread row).
- `docs/decisions/transactions.md`: a Log entry for computed slices with a stored end date over stored allocations, forward-only spreading, no splits or refunds in the first version, and the drill-through flag.
- `docs/data-model.md`, `docs/api.md`, `docs/features/exports.md` and `docs/scope.md` §Transactions.

## What must be true to ship

1. A search for sums of `ReportingAmount` over transactions finds only the paths in backend steps 3 to 5 and the paths listed as unchanged in the Outcome. Each of those is named in `docs/architecture/transactions.md`.
2. The report, dashboard, budget and month-close integration tests above pass with a spread row in the seeded data.

## Open questions

- Should a spread be able to start before the payment, for a bill paid in arrears? Today it is forward only; a start offset would be one more column.
- Should the import review offer Spread over for a row, or is setting it afterwards in the ledger enough?
