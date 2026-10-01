# Goals: decisions

Related: feature page [Goals](../features/goals.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-10-01.** `PATCH /api/goals/{id}/progress` takes exactly one of `currentAmount`, which sets the saved amount, or `delta`, which adds to it and may be negative to take money out. The result may pass the target but not fall below zero, which answers `money.nonNegative`. Decided while the owner was away, to be reviewed
  - Rejected: `currentAmount` only; `delta` only; clamping a delta that overshoots at zero; a separate `POST /api/goals/{id}/deposits`
  - Why: A script that knows the balance it saved to sets the amount, and an automation that fires on "moved 50 to savings" knows only the 50; asking it to read the goal first and add would race with the next run. Clamping would hide a script's mistake behind a plausible number. A deposit route would suggest a history of deposits the goal does not keep
- **2026-10-01.** A goal funded from an account answers 400 `goal.notManual` on the progress route, a new code with English and Lithuanian text. Decided while the owner was away, to be reviewed
  - Rejected: `resource.readOnly`, whose text is about imported entries; `value.locked`, which says the value can never change; ignoring the amount as the full update does for a funded goal
  - Why: The full update ignores `currentAmount` for a funded goal because the form sends both modes in one body. A script that sends only an amount and gets 200 back would believe it moved the goal while the account still decides the progress. The new code says what to do: switch the goal to manual progress in the browser
- **2026-10-01.** Progress updates on one goal run one at a time: `GoalService.UpdateProgressAsync` opens a transaction and takes the goal's advisory lock (`AdvisoryLock.LockAsync(id)`, as recurring confirmations do) before reading the amount it adds to. Decided while the owner was away, to be reviewed
  - Rejected: A concurrency token on `CurrentAmount`, answering 409 to the loser; one `ExecuteUpdate` that adds in SQL
  - Why: Two automations firing together would otherwise both read 100 and both write 150. A concurrency token pushes a retry onto every script for a case the server can serialise itself. An `ExecuteUpdate` bypasses the change tracker, so a shared goal's change would miss the household activity log
- **2026-10-01.** The goal row keeps only Edit and Delete; there is no quick "Update progress" action in the browser. Decided while the owner was away, to be reviewed
  - Rejected: A small dialog with one amount field and Set or Add
  - Why: The edit form already holds the amount in one field and the backlog item asked for automations. A dialog would add a component, its stories and locale keys for a click the form already gives; the route is there for it if daily use asks
- **2026-09-20.** A goal funded from an account takes a whole percentage of that account's reporting balance (`fundingSharePercent`, 1 to 100, default 100), computed per request into a nullable `progressAmount` and never stored
  - Rejected: A fixed amount cap instead of a share; a decimal percentage; several accounts per goal; storing the derived progress and keeping it in step
  - Why: A cap has to be re-typed whenever the target or the balance moves and says nothing about a joint account split between two goals, while a percentage covers both "all of it" and "my half" and reads the same after the balance changes. Whole percents avoid a second money-like rounding rule for a household tool where 33.33% is not a real need. Several accounts would need a join table and an allocation order for one row's worth of value. Storing the progress repeats the argument that already keeps holdings and the portfolio series uncached: it depends on transactions, transfers, conversions, holdings, prices and rates, and one missed invalidation shows a wrong number
- **2026-09-20.** The goals list reads its balances through one `IAccountService.GetReportingBalancesAsync` call for the distinct funding accounts, and a funding account that is archived or no longer visible answers `progressAmount` null instead of failing
  - Rejected: A second balance query written inside `GoalService`; one balance call per goal; dropping such a goal from the list or answering 404
  - Why: A second balance path would have to repeat starting balances, transactions, both transfer directions, conversions and `HoldingsValuation`, and would drift from the accounts page the first time one of them changes. Per-goal calls turn a page of goals into a query storm for numbers that share accounts. Hiding or failing the row loses a goal the owner can still edit back to manual, which is the only way out of the state
- **2026-09-19.** A goal's current amount must be zero or more
  - Rejected: Keeping negative progress
  - Why: Nothing described a meaning for it, the progress meter cannot show it, and every other stored amount of this kind uses the non-negative rule. Progress above the target stays allowed
