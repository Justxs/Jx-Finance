# Goals: decisions

Related: feature page [Goals](../features/goals.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-20.** A goal funded from an account takes a whole percentage of that account's reporting balance (`fundingSharePercent`, 1 to 100, default 100), computed per request into a nullable `progressAmount` and never stored
  - Rejected: A fixed amount cap instead of a share; a decimal percentage; several accounts per goal; storing the derived progress and keeping it in step
  - Why: A cap has to be re-typed whenever the target or the balance moves and says nothing about a joint account split between two goals, while a percentage covers both "all of it" and "my half" and reads the same after the balance changes. Whole percents avoid a second money-like rounding rule for a household tool where 33.33% is not a real need. Several accounts would need a join table and an allocation order for one row's worth of value. Storing the progress repeats the argument that already keeps holdings and the portfolio series uncached: it depends on transactions, transfers, conversions, holdings, prices and rates, and one missed invalidation shows a wrong number
- **2026-09-20.** The goals list reads its balances through one `IAccountService.GetReportingBalancesAsync` call for the distinct funding accounts, and a funding account that is archived or no longer visible answers `progressAmount` null instead of failing
  - Rejected: A second balance query written inside `GoalService`; one balance call per goal; dropping such a goal from the list or answering 404
  - Why: A second balance path would have to repeat starting balances, transactions, both transfer directions, conversions and `HoldingsValuation`, and would drift from the accounts page the first time one of them changes. Per-goal calls turn a page of goals into a query storm for numbers that share accounts. Hiding or failing the row loses a goal the owner can still edit back to manual, which is the only way out of the state
- **2026-09-19.** A goal's current amount must be zero or more
  - Rejected: Keeping negative progress
  - Why: Nothing described a meaning for it, the progress meter cannot show it, and every other stored amount of this kind uses the non-negative rule. Progress above the target stays allowed
