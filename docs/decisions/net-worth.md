# Net worth: decisions

Related: feature page [Net worth](../features/net-worth.md).

## Current

### Net worth

Includes full balances of all visible accounts plus all visible assets minus all visible debts, own or shared with a household, a debt that tracks payments counting with its tracked balance; since 2026-10-02 a member may opt in to count their open settle-up balances, a receivable inside assets and a payable inside debts ([Households and sharing](households-and-sharing.md)); this is not an ownership-percentage calculation

### Snapshot schedule

Refresh today's snapshot hourly and on viewing; unique user/date; no invented historical points, and snapshots already taken are not rewritten when a past valuation is added; a total beyond numeric(18,2) is still answered and that day's snapshot is skipped

### Asset value

An asset keeps dated valuations, today or earlier, and may depreciate on a straight line in whole monthly steps down to a residual value. The monthly amount is `(start value − residual) / life` rounded up to the cent, so the last step is the smaller one, and a manual valuation on or after the start date restarts the decline from that value at the same monthly amount. The value on any date is computed from the valuations and the terms when it is read and is never stored; an asset counts in net worth from its first valuation

### Debt balance

A debt keeps dated recorded balances, today or earlier, and its outstanding amount and as-of date are the newest of them; creating or editing the debt records one, and the page lists them with add, edit and delete. Tracked payments count from the newest

### Pace

The Trend chart continues at the average monthly change of the last twelve months of snapshots (at least 90 days), as far ahead as that window reaches back and at most a year, and dates up to five per-browser milestones; computed in the browser and labelled as arithmetic, not advice

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/net-worth.md`).

- **2026-10-01.** A debt's recorded balance is kept as rows of a `DebtBalanceEntries` table, one per debt and date with an optional note, written by `DebtBalanceBook` exactly as `AssetValuationBook` writes asset valuations: creating a debt records its first balance, editing the amount or the date records one for that date, and `Debt.OutstandingAmount` and `AsOf` stay as the denormalized newest balance, so a balance for an earlier date only adds history. Decided while the owner was away, to be reviewed
  - Rejected: Deriving the history from the household activity log; dropping `OutstandingAmount` and `AsOf` and reading the newest row everywhere; letting a debt edit to an earlier date replace the newest balance
  - Why: The activity log covers only shared debts and keeps text, not amounts. Keeping the two columns leaves net worth, the schedule, tracked payments and the snapshot job untouched, and following the asset rule means one behaviour to learn for both sides of the balance sheet
- **2026-10-01.** Existing debts get their first balance from an idempotent startup step, `DebtBalanceBackfill`, run after the migrations and `PayeeKeyBackfill`, which inserts one balance from the current record for every debt, deleted ones included, that has none; the `AddDebtBalanceEntries` migration only creates the table. Decided while the owner was away, to be reviewed
  - Rejected: An `INSERT` in the migration's `Up`, as `AddAssetValuations` did; a one-off command the administrator runs
  - Why: Generated migrations are not edited by hand any more, and `PayeeKeyBackfill` is the precedent for filling rows at startup. A step that only inserts where nothing exists is safe to run at every start and needs nobody to remember it
- **2026-10-01.** The recorded balances live at the end of the existing debt page, which every debt row now opens, with add, edit and delete; a deleted balance is gone for good and the last one cannot be deleted (`debt.lastBalance`). Members who can see a shared debt edit its balances, and changes are audited as the debt's `balances` field. Decided while the owner was away, to be reviewed
  - Rejected: A read-only list; a page or tab of its own; trash and undo for single balances
  - Why: Editing came almost free by mirroring the asset valuations section, and it is how a wrong bank figure gets fixed. The debt page is where the schedule and the payments already are, so no page is added, and a single balance is as small as an asset valuation, which has no trash either
- **2026-10-01.** The pace is the plain average change between the newest snapshot on or before twelve months before the last one and the last one, per month of 30.4375 days; with less history the window starts at the first snapshot, and under 90 days there is no pace. Decided while the owner was away, to be reviewed
  - Rejected: A least-squares line through the window; a fixed twelve-month requirement; any length of history
  - Why: Two recorded figures and one division can be checked by hand, which is what "arithmetic on recorded figures" promises. Waiting a full year hides the feature for a new installation, while a few weeks of snapshots would turn one salary or one revaluation into a monthly rate
- **2026-10-01.** The dashed line runs as far ahead as the window reaches back, at most a year, with as many points as the window has; milestones are dated up to 50 years ahead, "Not within 50 years at this pace" beyond. Decided while the owner was away, to be reviewed
  - Rejected: Always a year ahead; drawing every milestone on the chart; dating milestones without a limit
  - Why: Three months of history extended by twelve would draw a longer guess than the record it rests on. The chart's date axis is categorical, so matching the point count keeps future and past at one scale. A date centuries away reads as precision the arithmetic does not have
- **2026-10-01.** Milestones are a per-browser list in the preferences row, up to five amounts in the reporting currency, defaulting to the next two round numbers of the 1, 2, 5 series above the last snapshot, or 0 and a round number when net worth is negative. Decided while the owner was away, to be reviewed
  - Rejected: Milestones stored on the server per member; only automatic round numbers; fixed defaults such as 100 000
  - Why: The pace is a view of figures the server already answers, so a table and an endpoint for it would be code for a preference. Round numbers alone cannot hold a target such as a deposit, and fixed defaults mean nothing across currencies and sizes of household
- **2026-10-01.** A zero or falling pace says "Not reached at this pace" for every milestone above the last snapshot, and a milestone at or below it reads "Already reached"; the line still draws flat or falling. Decided while the owner was away, to be reviewed
  - Rejected: Hiding the line when the pace is not positive; dating when a falling net worth would cross a milestone below it
  - Why: A falling trend is the most useful thing the line can show, and milestones are targets to reach upwards
- **2026-10-01.** Computed in the browser from `GET /api/networth/history` and drawn only on the net worth page, on the member's whole net worth whatever the household switcher shows. Decided while the owner was away, to be reviewed
  - Rejected: A server endpoint answering the pace; a pace per household
  - Why: The history is already loaded for the chart and the arithmetic is a few lines. Snapshots are always the whole net worth, so the chart and its pace read the same series

- **2026-09-27.** Asset valuations are rows of an `AssetValuation` table, one per asset and date, removed with the asset by a cascade; `Asset.CurrentValue` and `AsOf` stay as the newest valuation, kept in step by one `AssetValuationBook`
  - Rejected: Overwriting `CurrentValue` as before
  - Why: The same shape as the security price history, which already works: a write for a date that has a row replaces it, and deleting the newest falls back to the next
- **2026-09-27.** Depreciation is a straight line in whole monthly steps on the start date's day of month, never below the residual; the terms are optional: start date, start value, life of 1 to 600 months and residual value
  - Rejected: Daily pro rata; declining balance
  - Why: Monthly steps give amounts in cents that a person can check by hand. Declining balance can come later as a second method
