# Money and multi-currency: decisions

Related: feature page [Multi-currency](../features/multi-currency.md); architecture [Multi-currency](../architecture/multi-currency.md).

## Current

Amount plus ISO currency; one installation-wide reporting currency (default EUR); ECB daily rates, which an administrator can override or fill in by hand per currency and date, a hand rate winning on its own date and revaluing the rows that depend on it; only the 30 currencies of the `Currency` enum; income and expenses valued at the transaction-date rate, holdings at the newest rate; decimal/numeric(18,2); canonical strings over HTTP; comma input normalized at the client

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-10-01.** Rates entered by hand are kept in their own `ManualExchangeRates` table, and a hand rate wins over the synced ECB rate of the same date. Decided while the owner was away, to be reviewed
  - Rejected: A `Source` column on `ExchangeRates` with one row per date and currency, as security prices keep one row per date with its source; a source column inside the key, with two rows per date
  - Why: One row per date would overwrite the ECB value, so deleting a hand rate could only fall back by fetching again, which fails while sync is off, the very case a hand rate is for. Two rows in one table would make every coverage, sync and lookup query filter by source, and a hand rate would count as a fetched day. A table of its own leaves the sync untouched. The precedence mirrors live prices, where a typed price is never replaced by a fetched one
- **2026-10-01.** A rate lookup takes each currency's newest rate on or before the date and leaves out a currency whose rate is more than five days older than the newest date of the table; the on-demand fetch is decided by the newest synced date alone. Decided while the owner was away, to be reviewed
  - Rejected: Keeping the lookup by whole date, as before
  - Why: A hand rate on a weekend would make that date the newest and hide every other currency for it. Without the five-day cut, a hand rate entered today after weeks without sync would make all the old rates look fresh. Deciding the fetch on the hand rate would stop back-dated days from getting their ECB rates
- **2026-10-01.** Saving or deleting a hand rate revalues, in the same transaction and under the reporting-currency change's table lock, the transactions and investment entries dated from that date up to the day before the next stored rate of that currency and not after today, in that currency, or every foreign row when the currency is the reporting currency; a row that cannot be valued rolls it all back. Decided while the owner was away, to be reviewed
  - Rejected: Leaving existing rows at the value they were saved with; revaluing every row of the currency; a background job
  - Why: The point of a hand rate is often to correct rows already entered, and the batch revaluation of the reporting-currency change (`IReportingRevaluation`) already does this safely. Rows outside the window are valued at another stored rate and do not change. A future-dated row was valued at today's rate when saved and keeps it, as it does when rates sync later. Doing it in the request keeps the change all or nothing
- **2026-10-01.** No currencies outside the 30 of the `Currency` enum, not even through a hand rate. Decided while the owner was away, to be reviewed
  - Rejected: Letting an administrator add a currency code with hand rates
  - Why: The currency is an enum on the wire, in the database conversion, in the generated client and its zod schemas, and in `Intl` formatting, so a new code is a code change, not a setting. The enum already holds the euro and the ECB's reference currencies
- **2026-09-19.** Updating a conversion keeps its account and does not touch a fee transaction that was split by hand
  - Rejected: Letting the account change; rewriting the split lines in proportion
  - Why: Moving a conversion between accounts is a delete and a new entry, with no fee link to carry over. Scaling somebody's hand-made split silently changes category totals they chose; refusing with `transaction.splitNotAllowed` sends them to the form that owns lines
- **2026-09-19.** A reporting-currency change locks the transaction and investment tables, then revalues in batches inside the one database transaction
  - Rejected: Loading every row at once; committing per batch
  - Why: Memory stays at one batch while the change remains all or nothing; the table lock keeps the paged read stable, because no row can be added or removed between two batches
