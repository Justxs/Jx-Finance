# Recurring entries and subscription detection: decisions

Related: feature page [Recurring entries](../features/recurring-bills.md); architecture [Background work and notifications](../architecture/background-jobs.md).

## Current

### Recurring entries

Three shapes — expense, income and transfer between two of your own accounts — each fixed or variable; no auto-posting; expected occurrence date required for confirmation; inactive entries reject confirmation; repeats notify once per day; a transfer confirmation goes through the ordinary transfer create path, so the cross-currency rules are the same ones; stored as `RecurringBill` under `/api/recurring-bills` although the user-facing name changed

### Subscription detection

A read-only analysis over the caller's visible expenses of the last 24 months, grouped by account and by a description normalized in one tested pure function; a group needs three occurrences, consecutive gaps that all fit one cadence (7 ± 2, 30 ± 5, 91 ± 12 or 365 ± 30 days) and every amount within 15% of the median, which is what it reports as the typical amount. Groups covered by an **active** recurring entry of the same normalized name, and groups the caller dismissed, are left out. The query is bounded — the window, the newest 4000 rows and a five-column projection — and the grouping is one in-memory pass, because bank noise means no two occurrences of one subscription carry the same text and a SQL `GROUP BY` would find nothing. Creating an entry from a candidate goes through the ordinary create form and `POST /api/recurring-bills`; there is no second write path

### Dismissing a suggestion

Stored per user and per group — the account and the normalized description — rather than per transaction, so a new payment in the same group does not bring the suggestion back. It is personal rather than shared, like a categorization rule: two members of one household may disagree about a payment on the account they share. Dismissing twice writes nothing. There is no screen to undo a dismissal yet; the row is there when one is wanted

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-29.** A recurring entry's bank charges are the rows whose normalized description equals its match key or its normalized name, everywhere: the latest match, price-rise alerts and the cash flow forecast share `PriceRiseMatcher.KeysOf`
  - Rejected: The match key alone for the latest match and price rises, while the forecast also took the name
  - Why: Confirming an occurrence writes a row under the entry's name, so with a separate match key those confirmed payments were counted by the forecast but invisible to the latest match and the price-rise comparison. One definition keeps the three from disagreeing about which rows pay the entry
- **2026-09-27.** A recurring expense may name only a debt that tracks payments, checked while Net worth is on; while it is off the stored link is left alone and a confirmation links nothing
  - Rejected: Accepting any owned debt and linking nothing on confirmation; refusing a debt while Net worth is off
  - Why: A link that silently does nothing looks like it works until the balance is wrong. Refusing it while the feature is off would make an unrelated edit, such as "Update expected", fail on an entry that was valid when it was saved
- **2026-09-20.** A recurring entry gains a `Shape` (`Expense`, `Income`, `Transfer`) beside its existing `Kind`, and a transfer carries a second account in the new `ToAccountId`
  - Rejected: A separate `RecurringTransfer` entity and endpoint group; overloading `Kind` into one five-value enum; deriving the shape from which fields are filled
  - Why: A second entity would duplicate the cadence, the anchor day, the reminder window, the reminder job, the dedupe rule, the stale-confirmation handling and the page for a row that differs in what one method writes. One five-value enum makes "fixed or variable" and "expense, income or transfer" the same question, so a variable transfer becomes unexpressible. Deriving the shape from the filled fields has no answer for an expense that has no category and no default account, which is a normal entry today
- **2026-09-20.** The user-facing name becomes "recurring entries" in both locales while the table, the entity and the route prefix stay `RecurringBill` and `/api/recurring-bills`
  - Rejected: Renaming the table and the entity along with the wording; keeping "bills" everywhere
  - Why: "Bills" says expense, which is wrong for two of the three shapes, and the screen is what users read. The rename is not worth its price: a table rename is a migration, and a backup file names the tables it carries, so every backup taken by an older version would stop restoring into the new schema — the one thing a backup exists to do. The route prefix would break saved links and the feature switch's name for no user-visible gain
- **2026-09-20.** Confirming a recurring transfer builds a `CreateTransferRequest` and calls `TransferService.CreateAsync` inside the confirmation's own database transaction, and the confirm body gained `receivedAmount`
  - Rejected: Writing a `Transfer` row directly in `RecurringBillService`; converting the amount with the exchange-rate service instead of asking for the received amount
  - Why: The create path owns rules a second writer would have to copy and would drift from: resolving each account's currency, demanding the received amount across currencies, refusing a mismatched pair in one currency, and refusing a disabled currency. Both services share the request-scoped `AppDbContext`, so the reuse costs nothing in atomicity — the transfer, the advance and the read reminders still commit together under one advisory lock. Converting at a reference rate would invent a figure the bank did not use, and a manual cross-currency transfer already asks for the real one
- **2026-09-20.** The `billDue` notification payload carries `shape`, and the bell picks one of three sentences from it; a row without a shape reads as an expense
  - Rejected: One sentence per locale with a neutral wording covering all three; a new `NotificationType` per shape
  - Why: A neutral sentence in Lithuanian either says "mokėjimo data", which is wrong for income, or degrades to a bare date that says nothing. Three enum kinds would widen the type for a difference that is already in the payload, and would make the dedupe query and the bell's feature mapping learn three names for one producer. Reminders written before this change have no shape, and every one of them was an expense
