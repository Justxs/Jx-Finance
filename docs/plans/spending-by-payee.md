# Plan: Spending by payee

Status: planned 2026-09-28. Size M. Needs nothing else first. Its stored `Transaction.PayeeKey` is then read by [Rule suggestions from history](rule-suggestions.md) and [Machine-learned categorization](machine-learned-categorization.md) instead of normalizing in memory. If [Refunds](refunds.md) lands, a refund carries the shop's description and lowers that payee's total the same way it lowers the category's.

## Outcome

- The reports page gets an "Expense by payee" section under the tag breakdown. It answers "how much went to Maxima this year" for any range the page already offers: the eight largest payees, with **Show all** revealing up to fifty.
- With a comparison selected, each payee shows the earlier amount and the change badge, exactly like categories and tags. A payee that stopped costing anything keeps its place.
- Each payee links to the ledger filtered to that payee, the range and expenses. The ledger's totals there equal the report's number.
- The ledger's CSV and PDF export follow the new filter, so the rows behind a payee total can be taken out.
- Expenses with no description are one "No description" entry, without a link.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| What a payee is | `SubscriptionDescription.Normalize(Description)`: lowercase words, punctuation dropped, tokens with three or more digits dropped. It is the key unusual amounts and subscription detection group by | A new normalizer; the raw description | One definition of "the same payee" across the product. Reference numbers and dates on card lines stop splitting one shop into many rows |
| Where it is normalized | A stored column `Transaction.PayeeKey`, written in C# by `AppDbContext.ApplyEntityRules` when a tracked transaction is added or its `Description` changes | Normalizing in SQL with `regexp_replace`; loading the range's expenses and grouping in memory | SQL cannot reproduce `char.IsLetterOrDigit` and the digit-count rule exactly, and two definitions would drift. In memory is fast enough for a year of a household's rows, but the ledger drill-through needs a `WHERE` on the key for paging and totals, which only a column gives. With the column the report is one grouped query, like the tag breakdown |
| Backfill | `PayeeKeyBackfill` runs in `WebApplicationExtensions.ApplyMigrationsAsync` right after `MigrateAsync`. It fills rows where `PayeeKey IS NULL` in pages of 1,000, with `IgnoreQueryFilters`, deleted rows included | Computing it in the migration; a periodic job | A migration cannot call the C# normalizer. A job would leave the report wrong until it finished. A household ledger is tens of thousands of rows, which takes seconds once, and `--seed-demo` already goes through the same method |
| Writers | Every path that writes `Description` goes through the change tracker today; no `ExecuteUpdate` sets it. A unit test in `AppDbContextTests` keeps that true for adds and edits | Setting the key in each service | One hook, like the one that resets `UnusualCheckedAt` |
| Changing the normalizer later | Any change to `Normalize` ships with a migration that sets `PayeeKey` back to null, and the startup backfill recomputes it | A version column beside the key | Changes are rare, and one sentence in the docs costs less than a column |
| What is counted | Expenses only; whole transactions, so a split row counts once under its own description; the sum of `ReportingAmount`. Investment cash flows and transfers have no description in this sense and are left out, so the list can sum to less than `totalExpense` | Income by payee; split lines | Same shape as the tag breakdown. A split divides one payment between categories, not between payees |
| How many | The server returns at most `PayeeBreakdown.MaxItems = 50`, ordered by the larger of the two amounts, as tags are. The page shows eight and **Show all** reveals the rest in place | Every payee; a paged endpoint of its own | Fifty covers the payees worth reading. Anything smaller is one ledger search away |
| Label | The newest description of that key in the chosen period, falling back to the earlier period, read in a second query only for the listed keys | The lowercase key; the most frequent description | It reads like the bank text people recognize. It costs one query over at most 50 keys |
| Drill-through | A new ledger filter `payee`, matched as `PayeeKey == Normalize(value)`, so a pasted description also works. The list, the totals and both exports follow it | The existing `search` filter | `search` is `ILIKE` on the raw text, so "maxima lt" would miss "MAXIMA LT, UAB" and the totals would disagree with the report |
| Export | No export of the breakdown. The report page's CSV and PDF are transaction exports, and they stay that way | A CSV of the payee list | The report exports no breakdown today (see "What is not exported" on the Reports page). The ledger export of a drill-through already gives the rows behind any payee total |
| Where it sits | A section on `/reports`, behind the `Reports` switch, no switch of its own | A page or a tab of its own | Fewer pages; it is one more breakdown of the same range |
| Index | Only the partial index for the backfill. The report and the ledger filter are bounded by date and account and use the existing (AccountId, Date) index | An index on `PayeeKey` from the start | Measure first with `just seed` and `EXPLAIN`; add (AccountId, PayeeKey) only if an all-dates payee filter is slow |
| Other features | Unusual amounts, subscription detection and price rises keep normalizing in memory in this change | Moving them to the column now | Each already works and has its own tests. Moving them is a follow-up that only removes code |

## Data model

| Change | Detail |
| --- | --- |
| `Transaction.PayeeKey?` | Max `SubscriptionDescription.MaxLength` (200). Null means not computed yet. An empty string means the row has no key: no description, or nothing left after normalizing |
| Index | Partial index on `Id` where `PayeeKey` is null, for the backfill |
| Migration | `just migrate-add AddTransactionPayeeKey`. It adds the column and changes no rows; the startup backfill fills them |

A backup and a restore carry the column like any other; a restore needs the same schema anyway.

## Backend steps

1. **Column and hook.** Add the property and configure it in `TransactionConfiguration`. In `AppDbContext.ApplyEntityRules`, set `PayeeKey = SubscriptionDescription.Normalize(Description)` on `Added`, and on `Modified` when `Description` is modified.
2. **Backfill.** `Infrastructure/Data/PayeeKeyBackfill.RunAsync(AppDbContext, CancellationToken)`: read id and description of 1,000 null rows, normalize, write the page with one `ExecuteSqlAsync` `UPDATE … FROM unnest(@ids, @keys)`, and repeat until none are left. Writing past the change tracker keeps `UpdatedAt` and the audit log unchanged, so month-end close shows no drift. Log the count once.
3. **Ledger filter.** `TransactionFilterRequest` gains `Payee`. `TransactionService.Filtered` normalizes it and adds `t.PayeeKey == key` when the key is not empty. `TransactionFilterValidator` gets the shared max-length rule. `TransactionFilterSummary` describes it. Export, totals and the list share the filter, so all of them follow.
4. **Report.** `PayeeBreakdownItem(string? PayeeKey, string? Label, decimal Amount, decimal? ComparisonAmount, int Count)` in `Endpoints/Reports/Shared`. `ReportSummaryResponse` gains `ExpenseByPayee` after `ExpenseByTag`. `ReportService.BuildPayeeBreakdownAsync(period, comparison)`:
   - one grouped query over `db.Transactions.Where(Within(period, comparison))` for expenses, grouped by `PayeeKey` and "inside the chosen period", summing `ReportingAmount` and counting rows;
   - a merge by key with `0.00` on the empty side, ordered by the larger amount, cut to `MaxItems`;
   - one label query for those keys.

   Rows with an empty key become one item with `PayeeKey` null. Visibility and the active household come from the query filter, as for tags.
5. **Summary** of `GET /api/reports/summary` describes the new list, that it counts whole transactions and that its keys match the ledger's `payee` filter.
6. **Error codes:** none new.

## Frontend steps

1. `just gen`. No new mutation.
2. **Breakdown.** `features/reports/payee-breakdown/payee-breakdown.tsx` follows `tag-breakdown.tsx` and reuses `BreakdownList` and `breakdownWeight`. It shows eight rows and a **Show all** button kept in `useState`. The empty-key item renders muted, as "No description", with no link. `BreakdownRow.filter` in `breakdown-list.tsx` gains `payee`.
3. **Page.** `reports-page.tsx` adds a `TitledSection` "Expense by payee" under the tag breakdown, with a one-line hint that whole transactions are counted and similar texts are grouped.
4. **Ledger.** `routes/transactions.tsx` adds `payee: optionalParam(z.string())` to the search schema. `transaction-filter-fields.ts` and `use-transaction-filters.ts` pass it on, and `active-filters.tsx` shows a removable "Payee: …" chip. The filters dialog gets no field for it, because the filter is reached from the report. The saved-filter schema in `stores/transaction-views.ts` gains an optional `payee`, so old saved filters still parse.
5. **Text.** English and Lithuanian keys for the section title, the hint, "No description", **Show all** and the chip.
6. **Stories.** `payee-breakdown` covers default, with comparison, empty and a `play` that opens **Show all**. The report fixture gains `expenseByPayee`.

## Tests

- **Unit:** `AppDbContextTests`: the key is set on add, recomputed when the description changes, left alone when only the amount changes, and empty for a null description.
- **Integration:**
  - In `Integration/Reports`: two descriptions that differ only in reference digits share one item; a split expense counts once at its own reporting amount; income and investment flows are left out; the comparison merges keys with zero on the empty side; the list stops at 50; the label is the newest description; a shared account's rows appear for both members and the active household narrows them.
  - In `Integration/Transactions`: the `payee` filter returns the rows behind a report item and the ledger totals equal its amount; a raw description passed as `payee` works; the CSV export follows the filter.
  - A backfill test: rows written with a null key, deleted ones included, get their key, and `UpdatedAt` does not move.
- **Frontend:** the route search schema accepts and drops `payee`; a saved filter without it parses.

## Docs

- `docs/features/reports.md`: an "Expense by payee" section with the key, what is counted, the cap, the label and the drill-through.
- `docs/decisions/reports.md`: a dated Log entry for the stored key against SQL or in-memory normalization.
- `docs/data-model.md` for `PayeeKey` and the backfill; `docs/features/transactions.md` for the `payee` filter; `docs/api.md`.
- `docs/features/unusual-amounts.md` and `docs/features/recurring-bills.md`: one line each saying the same key is now also stored, and that they still compute it themselves.
- `docs/scope.md` under Reports.

## Open questions

- A chain's shops can normalize to different keys ("maxima x vilnius" and "maxima kaunas"). Is the ledger's text search with its totals enough for "all of Maxima", or should the report be able to group payees by hand later?
- The import reads a separate payee (the Swedbank CSV's payee column, camt.053 `Cdtr/Nm` or `Dbtr/Nm`), shows it in the preview and does not store it. Should confirm store it, and should the key prefer it over the description? That would sharpen the key for unusual amounts and subscription detection too, but changes their grouping.
