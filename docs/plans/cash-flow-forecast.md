# Plan: Cash-flow forecast

Status: planned 2026-09-28. Size M. [Budget limits from history](../features/budgets.md#limits-from-history) has shipped and moved the median into `Common/Statistics.cs`, so this plan has no dependency left. It closes the recurring-entries forecast gap in section 2 of the [backlog](../backlog.md).

## Outcome

- The accounts page gets a "Next 90 days" section under the accounts table. A horizon select offers 30, 60 or 90 days.
- For the chosen account, a step line shows the balance from today to the end of the horizon, with one step per scheduled occurrence of the user's recurring entries: expenses, income and transfers, fixed and variable.
- A dashed second line shows the same balance with the account's usual everyday spending taken off day by day.
- Above the chart, one sentence per account at risk, such as "Everyday goes below zero on 14 Nov, after Rent (−€120.00)". Another reads "With usual spending, Everyday may go below zero around 2 Nov". When no account is at risk, it says "No account goes below zero in the next 90 days".
- Under the chart, the occurrences are listed: date, entry, amount and the balance after. An estimated amount is marked "≈" and an overdue one is tagged.
- A closed "Not counted" list names the entries the forecast could not place: no account, or a variable amount with no history yet.
- The recurring entries page shows the same section instead of the six-month bar chart of fixed expenses. A line reads "Scheduled in the next 90 days: €1,240 out, €3,100 in".
- A new dashboard card, "Cash flow", lists each account with scheduled entries: today's balance, the lowest balance in the horizon and its date, and any below-zero warning in the expense colour. Like upcoming bills, it shows on the current month only.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Where it is computed | On the server, `CashFlowForecastService` behind one endpoint, with a pure projection class | In the browser from the recurring list, as `BillsForecastChart` does | Variable estimates need ledger history. The accounts page, the recurring page and the dashboard card must agree, and a pure class can be unit tested |
| Starting point | The account's balance in its main currency as of today (`AccountMovements.SumAsync` with `until` today, plus the starting balance). Ledger rows dated after today, up to the horizon, are placed on their own dates | The accounts page's `currentBalance`, which counts future-dated rows today | Confirming an entry early posts a row dated on its due date and advances `NextDueDate`. Counting that row today, or leaving it out, would move or drop the payment |
| Currency | Main currency only. The other currencies an account holds are left out, and the account says so | Valuing every held currency at the newest rate | A bill leaves the EUR side of an account, and USD cash on it does not stop the EUR side going negative. The camt.053 closing-balance check follows the same rule |
| Fixed amounts | The entry's `Amount`, in the account's currency, as confirmation would post it | | |
| Variable amounts | The median of the last six rows matching the entry, within 13 months. A row matches when it is on the same account and of the same flow (a transaction of the same type, or a transfer to the same destination), and its normalized description equals `PriceRiseMatcher.KeyOf(MatchKey, Name)`. A confirmed occurrence carries the entry's name, so it matches; an imported bank row matches through the match key. With no match, the entry is listed under "Not counted" | Asking for an expected amount on variable entries; the last amount; leaving variable entries out | `RecurringBillInputValidator` deliberately keeps variable entries free of an amount. The median is the typical value the price-rise check already trusts. The list tells the user why an entry is missing |
| Match key for every shape | The form shows "Matches bank text" on income and transfer entries too. The server already normalizes it for any shape | Expense only, as today | A variable salary arrives as the bank's text, never as the entry's name, so without a key it would never be estimated |
| Overdue | An unconfirmed occurrence before today is placed on today and tagged overdue | Dropping it | Until it is confirmed or matched, the payment is still expected |
| Paid but not confirmed | The first occurrence is skipped when a matching row is dated from 5 days before `NextDueDate` (2 for weekly entries) up to today | Always counting it | Imported payments are often never confirmed. The month-close checklist chases the confirmation, and the forecast must not charge the payment twice |
| Transfers | Out of the source account. Into the destination when the caller can see it, converted at the newest rate when the currencies differ, and then marked estimated | Only the source side | Both balances move, and the destination is often the savings account the user asks about |
| Whose entries | The caller's own active entries. Recurring entries are personal, so a shared account is projected with the caller's entries only, and the section says "your recurring entries" | Including a household partner's entries | Recurring entries cannot be shared yet (backlog section 2). Reading someone else's personal rows would break the owner filter |
| Usual spending line | Yes, as a second line. Per account it is the median, over the last three complete months, of that month's expenses in the account's currency whose normalized description matches no active entry's key, divided by the days in that month. Accounts with less than three months of history get no second line | No second line; the mean; adding irregular income | Without it a salary account never goes below zero on paper: salary in, rent out, groceries ignored. The median ignores one large purchase. A separate line keeps the scheduled line exact |
| Warnings | Two dates per account: `belowZeroOn` for the scheduled line and `belowZeroWithSpendingOn` for the second line. The text says which one it is | One combined date | The first is a fact about the schedule and the second is a guess. The user should know which is which |
| Horizon | `days` from 30 to 90, default 90 | Six months, as the bar chart had | Beyond three months the estimates outweigh the schedule |
| The old chart | `BillsForecastChart` is deleted. The recurring page shows the forecast section and the scheduled in and out totals | Keeping both | Two forecasts on one page that disagree would each weaken the other. The monthly fixed-expense total the bars showed is the "out" figure |
| Dashboard card | A new `DashboardCard.CashFlow`, appended after `UpcomingBills`, behind `recurringBills` | Folding it into the upcoming-bills card | Card ids are published strings. `DashboardLayout.ResolvedOrder` appends an unknown-to-the-layout card at the end of saved layouts, shown, which is how a new card is meant to arrive |
| Switch | No switch of its own. The endpoint carries `RequiresFeature(Feature.RecurringBills)` | A `CashFlowForecast` switch | Without recurring entries there is nothing to project. The same metadata already gates the unusual-amount endpoints inside an ungated group |

## Data model

None. Nothing is stored; the forecast is computed on every read.

## Backend steps

1. **Median.** Use `Statistics.Median` from `Common/Statistics.cs`, shipped with [budget limits from history](../features/budgets.md#limits-from-history).
2. **Dated movements.** In `Endpoints/Accounts/Shared/AccountMovements.cs`, pull the union of the five sources into one private query that keeps `Date`. Then:
   - `SumAsync` groups it as before, and `AccountMovementsTests` still sees one statement.
   - A new `SumByDateAsync(db, ids, after, until, ct)` groups the same union by account, currency and date, for the rows dated after today.
3. **Matching history.** Give `PriceRiseMatcher.LoadChargesAsync` a `FlowType` parameter; its current callers pass `Expense`. The forecast loads income and expense rows through it rather than through a second loader. Transfers from the entries' accounts in the last 13 months come in one query over `db.Transfers`, normalized the same way.
4. **Pure projection.** `Endpoints/Accounts/Shared/CashFlowProjection.cs` holds the constants `MaxOccurrences = 64`, `EstimateSampleSize = 6`, `EstimateLookBackMonths = 13`, `PaidToleranceDays = 5`, `WeeklyPaidToleranceDays = 2` and `UsualSpendingMonths = 3`. Its functions:
   - `Occurrences(bill, today, end)` walks `RecurringBill.Advance(date, cadence, anchorDay)` from `NextDueDate`. It places an overdue first occurrence on today and applies the paid-but-not-confirmed rule.
   - `Estimate(matches)` returns the median of the newest six.
   - `UsualDailySpending(monthTotals)`.
   - `Project(startBalance, changes, dailySpending, today, end)` returns the entries with the balance after each, the lowest point and its date, `belowZeroOn` and `belowZeroWithSpendingOn`.
5. **Service.** `ICashFlowForecastService.GetAsync(int days, ct)` lives in `Endpoints/Accounts/Services/CashFlowForecastService.cs`. It reads:
   - the visible accounts;
   - the caller's active entries (`db.RecurringBills.Where(b => b.IsActive)`);
   - the balances as of today, and the future-dated movements;
   - the matching history for the entries' keys;
   - the newest rates once, through `IExchangeRateService.GetLatestAsync`.

   It answers `CashFlowForecastResponse(DateOnly From, DateOnly To, IReadOnlyList<AccountForecastResponse> Accounts, IReadOnlyList<ForecastSkippedEntry> NotCounted)`:
   - `AccountForecastResponse(Guid AccountId, string AccountName, Currency Currency, decimal StartBalance, decimal? UsualDailySpending, decimal LowestBalance, DateOnly LowestOn, DateOnly? BelowZeroOn, DateOnly? BelowZeroWithSpendingOn, bool OtherCurrencies, IReadOnlyList<ForecastEntryResponse> Entries)`. Only accounts with at least one entry in the horizon are listed, those at risk first, then by name.
   - `ForecastEntryResponse(DateOnly Date, ForecastEntrySource Source, Guid? BillId, string? Name, RecurringBillShape? Shape, decimal Amount, bool Estimated, bool Overdue, decimal BalanceAfter)`. `Source` is `Recurring` or `Ledger`, and a ledger entry is the day's already-entered rows summed. `Amount` is signed.
   - `ForecastSkippedEntry(Guid BillId, string Name, ForecastSkipReason Reason)`, with `NoAccount`, `NoHistory` or `AccountNotVisible`.
6. **Endpoint.** `GET /api/accounts/forecast?days=90` lives in `Endpoints/Accounts/GetCashFlowForecast/`, with the endpoint, request, validator and summary.
   - `Days` is validated with `IsWithin(30, 90)`, which publishes `range.invalid`. No new code is needed.
   - `Options(b => b.WithMetadata(new RequiresFeature(Feature.RecurringBills)))`.
   - The literal segment takes precedence over `/api/accounts/{id}`, as `/api/accounts/archived` already does. Add the route to `FeatureGateTests`.
7. **Card id.** Append `CashFlow` to `Domain/Dashboard/DashboardCard.cs`, never between existing values. `DashboardLayoutTests` gets a case: a layout saved before the card existed reads with `cashFlow` last and shown.

## Frontend steps

1. **Contract.** Run `just gen`. `/api/accounts/forecast` is under `/api/accounts`, so every ledger, transfer, conversion and investment mutation already refreshes it. Add `getAccountsQueryKey` to the recurring create, update and delete rule in `invalidation.ts`, so that editing an entry moves the forecast. The confirm rule already refreshes accounts. Test both in `invalidation.test.ts`.
2. **Section.** Add `features/accounts/cash-flow-forecast/` with `cash-flow-forecast.tsx`, a pure `forecast-series.ts` (with a unit test) and an `index.ts` that exports the chart part through `lazyChart`, as `bills-forecast-chart/index.ts` does today.
   - The section keeps the horizon and the account select in component state. The account select defaults to the first account at risk.
   - Warnings sit above the chart. The chart is `TimeSeriesLineChart` with `curve="stepAfter"`, `baseline`, `xAxis="date"`, the account's `currency`, and two series, "Scheduled" and "With usual spending". The second is a `comparison` line, so it is dashed.
   - The entries table follows the chart. "Not counted" is a `Disclosure`, and multi-currency accounts get a note.
   - `forecast-series.ts` turns the entries and the daily spending into one point per day.
3. **Accounts page.** Render the section under `AccountsTable`, before the archived accounts, in a `QueryBoundary`, while `recurringBills` is on. The `/accounts` loader warms `getCashFlowForecastSuspenseQueryOptions({ days: 90 })` inside `warmWithSettings` when the feature is on.
4. **Recurring page.** Replace the `TitledSection` holding `BillsForecastChart` with the section and the in and out totals, and warm the forecast in the `/recurring-bills` loader. Delete `features/recurring-bills/bills-forecast-chart/` (the component, its index and its story) and the `recurringBills.forecast*` keys in both locales.
5. **Form.** `RecurringBillForm` shows "Matches bank text" for every shape, with the hint reworded to say it also helps estimate variable amounts.
6. **Dashboard card.** Add `features/dashboard/cash-flow-card/cash-flow-card.tsx`, with one row per account: the name, today's balance, the lowest balance with its date, and the warning. Register it where the typed records force it:
   - `titleKeys.cashFlow = "dashboard.cashFlow"` and `cardFeature.cashFlow = "recurringBills"`;
   - `sectionCards.cashFlow`: narrow, linking to `/accounts`, and on a past month a text that the forecast shows on the current month. Generalise `CurrentMonthOnly` to take its text key;
   - a `cashFlow` case in `warmCard` that warms the forecast on the current month only.

   The customiser picks the card up from the enum.
7. **Texts and stories.** Add `forecast.*` and `dashboard.cashFlow` in both locales. Stories for the section: an account at risk only with usual spending, none at risk, variable estimated, not-counted entries, a multi-currency note, no entries, loading and `failWith`. Stories for the card: at risk, calm and a past month. Update the recurring page story.

## Tests

- **Unit:**
  - `CashFlowProjectionTests`:
    - a monthly entry anchored on the 31st through February, and weekly entries;
    - an overdue occurrence on today;
    - the paid-but-not-confirmed skip, at the edge of 5 days and of 2 for weekly;
    - the exact day the balance first goes below zero;
    - the second line crossing earlier than the first;
    - an occurrence on the last day of the horizon included;
    - the 64-occurrence cap.
  - `forecast-series.test.ts` on the client.
- **Integration** (`CashFlowForecastTests` in `Integration/Accounts`):
  - Shapes and amounts:
    - a fixed expense, a fixed income, and a transfer on both sides;
    - a cross-currency transfer estimated at the newest rate;
    - a variable expense estimated from confirmed rows, and one estimated from imported rows through the match key;
    - a variable entry without history, and an entry without an account, both under `notCounted`;
    - inactive entries ignored.
  - Dates and balances:
    - an entry confirmed early, whose row is dated in the future, counted once;
    - a multi-currency account projecting its main currency with `otherCurrencies`;
    - the usual-spending line leaving out rows that match an entry.
  - Visibility:
    - a household partner's entries on a shared account not included;
    - `X-Active-Household` narrowing the accounts.
  - Validation and the switch: `days` 29 and 91 answer 400 `range.invalid`, and `RecurringBills` off answers 404 `feature.disabled`.
- **Dashboard:** `DashboardLayoutTests` covers the appended card, and `dashboard-layout.test.ts` covers the card hidden while `recurringBills` is off.

## Docs

- A new `docs/features/cash-flow-forecast.md`, with a diagram from entries and balances to the two lines and the warnings, and the constants table. Add a row in `docs/features/README.md`.
- A new `docs/decisions/cash-flow-forecast.md` with the rows above, and a row in `docs/decisions/README.md`.
- `docs/features/recurring-bills.md`: replace the forecast paragraph under "Reminders and the forecast", and say the match key is offered for every shape.
- `docs/features/accounts.md`: the section.
- `docs/features/dashboard.md`: the card row in the table.
- `docs/architecture/accessibility.md`: swap `BillsForecastChart` for the new chart in the list of Recharts components.
- `docs/api.md`: the route.
- `docs/backlog.md`: remove the recurring-entries row from section 2, and move the idea from section 4 to Done.

## Open questions

- Should the accounts table also mark an account that goes below zero, or is the section below it enough?
- Is 90 days the right longest horizon, and three months the right window for usual spending?
