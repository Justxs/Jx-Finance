# Plans

A plan is written before a feature is built: the outcome, the design, the steps and the docs it will touch. Once the feature ships, its page under [features](../features/README.md) describes what exists; delete the plan then, because the feature page, the decisions log and the code are the record. Ideas without a plan stay in the [backlog](../backlog.md).

The table is in the suggested build order. Each plan's `Status:` line names what it must follow.

| Plan | Size | Where it lives | Build after |
| --- | --- | --- | --- |
| [Rule suggestions from history](rule-suggestions.md) | S | Toast after a save, Rules tab | |
| [Budget limits from history](budget-limits-from-history.md) | S | Budgets | |
| [Spending by payee](spending-by-payee.md) | M | Reports, ledger filter | |
| [Cash-flow forecast](cash-flow-forecast.md) | M | Recurring entries, Accounts, dashboard card | Budget limits from history |
| [Reconciliation by hand](reconciliation-by-hand.md) | M | Accounts, month close | |
| [Monthly digest](monthly-digest.md) | M | Notifications section of Settings | Reconciliation by hand |
| [Refunds](refunds.md) | M | Transaction form, import review | |
| [Generic CSV import](generic-csv-import.md) | M | Import dialog | |
| [Receipt reading and automatic splits](receipt-ocr.md) | L | Transaction form | |
| [Passkeys](passkeys.md) | M | Security section of Settings, sign-in | |
| [Personal API tokens](personal-api-tokens.md) | M | Security section of Settings | |
| [Data export per user](data-export-per-user.md) | M | Settings | |
| [Household settle-up](household-settle-up.md) | L | Households | Refunds, for "my share" later |
| [Machine-learned categorization](machine-learned-categorization.md) | L, gated | Import review, transaction form, ledger | Rule suggestions, six months of real data |

## Changes to shared code

Several plans touch the same code. Whichever lands second adapts to the first:

- `ImportService.ConfirmAsync` and the import preview, which already match hand-entered rows: refunds, generic CSV, reconciliation.
- `Common/Statistics.cs` (the median moved out of `UnusualAmountRule`): budget limits, cash-flow forecast.
- `Transaction.PayeeKey`: added by spending by payee, then read by rule suggestions and machine-learned categorization.
- The month-close checklist field `checklist.imports` is renamed by reconciliation by hand, a contract change.
- `ICurrentUser` registration gains a job user for the monthly digest.
- The Security section of Settings: passkeys and personal API tokens.

A new plan is a kebab-case file here, starting with `# Plan: <name>` and a `Status:` line, and gets a row in this table.
