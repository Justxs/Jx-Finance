# Plans

A plan is written before a feature is built: the outcome, the design, the steps and the docs it will touch. Once the feature ships, its page under [features](../features/README.md) describes what exists; delete the plan then, because the feature page, the decisions log and the code are the record. Ideas without a plan stay in the [backlog](../backlog.md).

The table is in the suggested build order. Each plan's `Status:` line names what it must follow.

| Plan | Size | Where it lives | Build after |
| --- | --- | --- | --- |
| [Refunds](refunds.md) | M | Transaction form, import review | |
| [Generic CSV import](generic-csv-import.md) | M | Import dialog | |
| [Receipt reading and automatic splits](receipt-ocr.md) | L | Transaction form | |
| [Passkeys](passkeys.md) | M | Security section of Settings, sign-in | |
| [Personal API tokens](personal-api-tokens.md) | M | Security section of Settings | |
| [Data export per user](data-export-per-user.md) | M | Settings | |
| [Household settle-up](household-settle-up.md) | L | Households | Refunds, for "my share" later |
| [Machine-learned categorization](machine-learned-categorization.md) | L, gated | Import review, transaction form, ledger | Six months of real data |

## Changes to shared code

Several plans touch the same code. Whichever lands second adapts to the first:

- `ImportService.ConfirmAsync` and the import preview, which already match hand-entered rows and, since [reconciliation](../features/reconciliation.md) shipped on 2026-09-29, record a camt.053 closing balance: refunds, generic CSV.
- `Common/Statistics.cs` (the median and spread moved out of `UnusualAmountRule`, shipped with [budget limits from history](../features/budgets.md#limits-from-history)), reused by the [cash-flow forecast](../features/cash-flow-forecast.md) since it shipped on 2026-09-29.
- `Transaction.PayeeKey`, shipped with [spending by payee](../features/reports.md#expense-by-payee) and already read by `SuggestedRuleService`: machine-learned categorization reads it too. The cash-flow forecast's usual spending groups by it too. Unusual amounts, subscription detection, price rises and the forecast's matching rows (through `PriceRiseMatcher.LoadChargesAsync`) still normalize in memory; moving them to the column is a follow-up that only removes code.
- The month-close checklist's `checklist.accounts`, which replaced `checklist.imports` when [reconciliation](../features/reconciliation.md#in-the-month-end-close) shipped: the [monthly digest](../features/monthly-digest.md), shipped on 2026-09-29, counts its `differs` and `behind` lines as accounts not reconciled, so a change to the states changes the digest too.
- `AccountMovements`, which gained `LedgerBalanceOnAsync` and `ListAsync` with [reconciliation](../features/reconciliation.md); `ListAsync` has its own union of the five sources beside the summing one, so refunds, which change how a transaction is signed, adapt both.
- `ICurrentUser`, which since the [monthly digest](../features/monthly-digest.md) shipped on 2026-09-29 resolves to a scoped `JobUser` inside `PeriodicJob.RunAsUserAsync` and to `HttpCurrentUser` everywhere else: a plan whose background work needs a service as one member sees it uses that scope rather than composing the service by hand.
- The Security section of Settings: passkeys and personal API tokens.

A new plan is a kebab-case file here, starting with `# Plan: <name>` and a `Status:` line, and gets a row in this table.
