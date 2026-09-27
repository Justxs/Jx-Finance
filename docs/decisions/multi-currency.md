# Money and multi-currency: decisions

Related: feature page [Multi-currency](../features/multi-currency.md); architecture [Multi-currency](../architecture/multi-currency.md).

## Current

Amount plus ISO currency; one installation-wide reporting currency (default EUR); ECB daily rates; income and expenses valued at the transaction-date rate, holdings at the newest rate; decimal/numeric(18,2); canonical strings over HTTP; comma input normalized at the client

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-19.** Updating a conversion keeps its account and does not touch a fee transaction that was split by hand
  - Rejected: Letting the account change; rewriting the split lines in proportion
  - Why: Moving a conversion between accounts is a delete and a new entry, with no fee link to carry over. Scaling somebody's hand-made split silently changes category totals they chose; refusing with `transaction.splitNotAllowed` sends them to the form that owns lines
- **2026-09-19.** A reporting-currency change locks the transaction and investment tables, then revalues in batches inside the one database transaction
  - Rejected: Loading every row at once; committing per batch
  - Why: Memory stays at one batch while the change remains all or nothing; the table lock keeps the paged read stable, because no row can be added or removed between two batches
