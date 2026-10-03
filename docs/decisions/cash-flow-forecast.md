# Cash-flow forecast: decisions

Related: feature page [Cash-flow forecast](../features/cash-flow-forecast.md).

## Current

Implemented 2026-09-29 behind the `RecurringBills` switch; since 2026-10-03 behind its own `CashFlowForecast` switch, and with entries off it projects the rows already dated ahead without them. `GET /api/accounts/forecast?days=` projects every visible account's main-currency balance from today's balance for 30 to 90 days, default 90, with the caller's own active recurring entries of every shape and the ledger rows already dated ahead; fixed entries count their amount, variable ones the median of their newest six matching rows within 13 months, overdue occurrences land on today, an occurrence a matching row already paid is skipped, and transfers arrive in a visible destination at the newest rate. A dashed second line takes off the account's usual daily spending, the median of the last three complete months outside the entries. Two dates are published, `belowZeroOn` for the schedule and `belowZeroWithSpendingOn` for the guess. The section sits under the accounts table and replaces the six-month bar chart on the recurring entries page; the dashboard gains a `cashFlow` card on the current month only. Nothing is stored

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/cash-flow-forecast.md`).

- **2026-10-03.** The forecast has its own `CashFlowForecast` switch and no longer needs `RecurringBills`; with entries off it leaves them out
  - Rejected: Keeping it under `RecurringBills`; requiring both switches; projecting entries that are hidden while their switch is off
  - Why: The owner wanted the forecast switchable on its own. The 2026-09-29 reason, nothing to project without entries, does not hold: rows dated ahead and the usual spending are projected without any entry. One feature per route keeps `RequiresFeature` and `FeatureGateTests` as they are, and a hidden entry moving a visible balance would be a number nobody can explain

- **2026-09-29.** Open questions of the plan, decided while the owner was away and to be reviewed: the accounts table gets no below-zero mark, because the forecast section directly under it already says which account is at risk; the longest horizon stays 90 days and usual spending stays three complete months until the daily-use trial shows otherwise
  - Rejected: A warning tag or icon on the account's row in the table; a six-month horizon; a six-month spending window
  - Why: Both were the conservative answers. A mark on the row would mean a second request or a forecast inside `GET /api/accounts`, which every page reads, for a sentence that sits one section lower. Beyond three months the estimates outweigh the schedule, and three months of spending follow a change in habits while one unusual month cannot move the median. Each number is a constant in `CashFlowProjection`, so changing it later costs one line
- **2026-09-29.** A row matches a recurring entry when its normalized description equals the entry's key (the match key, or the name) or the entry's normalized name; usual spending leaves out the rows of both
  - Rejected: The key alone, `PriceRiseMatcher.KeyOf(MatchKey, Name)`, as the plan wrote
  - Why: A confirmed occurrence is posted with the entry's name as its description, so an entry that has a match key would never find its own confirmed rows through the key alone: its variable amount would lose the confirmed history and usual spending would count those rows a second time. Accepting the name as well costs one more string in the comparison
- **2026-09-29.** The chart draws an ink zero line through the new `zeroLine` option of `TimeSeriesLineChart`, instead of the `baseline` axis rule
  - Rejected: `baseline`, as the plan wrote
  - Why: `baseline` rules the bottom of the plot, which is only zero while every balance is positive; the forecast exists to show a balance going below zero, and then the rule would sit under the lowest value. The zero line is the ink rule the income and expense chart already draws
- **2026-09-29.** Entries of one day are applied income first and a day is below zero when it ends below zero; every overdue occurrence is placed on today, not only the first; an account is listed when it has any entry in the horizon, a ledger day included; the recurring page's in and out totals leave transfers out
  - Rejected: Applying a day's entries in schedule order; placing only the first overdue occurrence; listing only accounts with recurring entries; counting a transfer as out on one account and in on the other
  - Why: A bank shows the balance at the end of the day, and a salary booked the same day as the rent does not overdraw the account. Each overdue occurrence still has to be confirmed on its own, so each is still expected. A row dated ahead moves the balance whether or not an entry exists. A transfer between the caller's own accounts is neither money in nor money out, and the "out" figure replaces the fixed-expense total of the old bars
- **2026-09-29.** The forecast is computed on the server by `CashFlowForecastService` behind one endpoint, with the arithmetic in the pure `CashFlowProjection`
  - Rejected: Computing it in the browser from the recurring list, as the old `BillsForecastChart` did
  - Why: Variable estimates need ledger history. The accounts page, the recurring page and the dashboard card must agree, and a pure class can be unit tested
- **2026-09-29.** The start is the balance as of today in the account's main currency, and ledger rows dated after today are placed on their own dates; other currencies are left out and the account says so
  - Rejected: The accounts page's `currentBalance`, which counts future-dated rows today; valuing every held currency at the newest rate
  - Why: Confirming early posts a row dated on the due date and advances `NextDueDate`, so counting that row today, or leaving it out, would move or drop the payment. A bill leaves the EUR side of an account, and dollars on it do not stop that side going negative; the camt.053 closing-balance check follows the same rule
- **2026-09-29.** A variable amount is the median of the newest six matching rows within 13 months, and an entry without one is listed under "Not counted"; "Matches bank text" is offered on income and transfer entries too
  - Rejected: Asking for an expected amount on variable entries; the last amount; leaving variable entries out; the match key on expenses only
  - Why: `RecurringBillInputValidator` deliberately keeps variable entries free of an amount. The median is the typical value the price-rise check already trusts, and the list tells the user why an entry is missing. A variable salary arrives as the bank's text, never as the entry's name, so without a key it would never be estimated; the server already normalized the key for every shape
- **2026-09-29.** An unconfirmed occurrence before today is placed on today and tagged overdue; the first occurrence is skipped when a matching row is dated from 5 days before `NextDueDate`, 2 for weekly entries, up to today
  - Rejected: Dropping overdue occurrences; always counting the first occurrence
  - Why: Until it is confirmed or matched the payment is still expected. Imported payments are often never confirmed, the month-close checklist chases the confirmation, and the forecast must not charge the payment twice
- **2026-09-29.** Transfers leave the source and arrive in the destination when the caller can see it, converted at the newest rate and then marked estimated; only the caller's own active entries count, and the section says "your recurring entries"
  - Rejected: Only the source side; including a household partner's entries on a shared account
  - Why: Both balances move, and the destination is often the savings account the user asks about. Recurring entries cannot be shared yet, and reading someone else's personal rows would break the owner filter
