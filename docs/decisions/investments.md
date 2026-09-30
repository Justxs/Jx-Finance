# Investments: decisions

Related: feature page [Investments](../features/investments.md); architecture [Investments](../architecture/investments.md).

## Current

Separate `InvestmentTransaction` ledger on ordinary accounts; FIFO cost basis; a price per security and date, written by hand or by the broker import, with no market data feed; the portfolio's value over time computed from that history on request; Interactive Brokers Flex Query by upload and Flex Web Service; dividends and interest count as report and dashboard income, withholding tax and standalone fees as expense, never in budgets; realised gain is portfolio-only; options, futures and short positions are out of scope

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-30.** The investments page renders the portfolio and the tax summary as two views, each with its own header, body and dialogs
  - Rejected: One page component that branches on the view for the title, the description, the header actions, the account filter, the error subject and the body; splitting out only the header actions
  - Why: Every part of the page differed between the two views, and the entry, import and securities dialogs open only from the portfolio. Two views hold one branch instead of six, and the dialog state lives where the buttons are
- **2026-09-21.** The yearly investment tax summary is printed from the page under a print stylesheet; there is no second PDF
  - Rejected: A MigraDoc PDF beside the transaction one; an HTML-to-PDF renderer in the backend
  - Why: MigraDoc lays the whole document out in memory, which is why the transaction PDF needs `App:PdfExportMaxRows`; a second MigraDoc document would mean laying the same tables out a second time, a second row cap and English-only text, because the PDF is written in the backend while this page is translated in the browser and formats money in the viewer's locale. Printing the page reuses the tables, the locale, the currency formatting and the frozen amounts already on screen, and is bounded by what one year of one caller's entries already put there. A second renderer would add a browser-sized dependency to the API image for one page
- **2026-09-21.** The tax summary CSV computes the year in memory and then writes its rows out, rather than streaming straight from a query
  - Rejected: Streaming rows from the database as the transaction CSV does; answering the JSON summary and building the CSV in the browser
  - Why: A first-in-first-out cost basis is not a property of the sell row: it needs every buy, sell and split of that holding from the beginning, so there is no query whose rows are the answer. The set is bounded by one year of one caller's entries, and the rows are still written to the response as they are produced, with no `Content-Length`, so the response shape stays the one the export decision of 2026-09-19 describes. Building the file in the browser would put money formatting and escaping in a second place and would make the export unavailable to anything that is not the page
- **2026-09-21.** The tax summary reports withholding tax and standalone fees as positive amounts paid, and applies no tax, rate or allowance of any kind
  - Rejected: Storing them with the ledger's own negative sign; computing a taxable base, an allowance or an amount owed for the Lithuanian declaration
  - Why: The sign matches what `PortfolioResponse.Years` already publishes, so a number on this page and the same number on the portfolio page cannot disagree, and "withholding tax: 4.44" reads the way a person filling a form reads it. Computing anything further would make the product state a tax position it cannot stand behind: rates, allowances and the treatment of a loss change by country and by year, and a wrong figure in this particular place is worse than no figure. The page and the documentation say plainly, in both languages, that it is a summary of recorded data and not tax advice
- **2026-09-21.** Account selection travels as one comma-separated `accountIds` query parameter, and an id the caller cannot see is dropped instead of refused
  - Rejected: A repeated `accountIds` key; answering 403 or 404 for an account the caller cannot see
  - Why: The comma-separated string is what `tagIds` already does and what the generated client puts on the wire anyway, and the CSV link is a plain browser navigation built by `buildExportUrl` rather than a client call. Refusing an unseen id would tell a stranger that an account with that id exists, which is exactly what the visibility filter is for; dropping it answers the caller's own accounts, which is what the default already does
- **2026-09-21.** `Position` now records the acquisition date of every lot and the lots each sale consumed; the tax summary reads them instead of a second replay of its own
  - Rejected: A separate first-in-first-out walk inside the tax summary service; storing disposals in a table when a sale is recorded
  - Why: Two replays of the same rule would eventually disagree, and the portfolio's realised gain and the tax summary's would be two numbers for one thing. A stored disposal would have to be rewritten whenever an earlier buy, sell or split is corrected or deleted, which the product allows, so the table would be a cache with no sound invalidation. The extra fields cost one `DateOnly` per lot and one list per sale in a replay that already runs per request
- **2026-09-20.** Reports and the dashboard read investment cash flows straight from the `InvestmentTransaction` ledger through `IInvestmentCashFlowService`: dividends and interest are income, withholding tax and standalone fees are expense, the sign of the entry is kept, and nothing is added while the `Investments` feature is off
  - Rejected: Mirroring every dividend into a `Transaction` row; classifying by the sign of the amount; counting realised gain as income
  - Why: A mirrored row would double the account balance or need a flag that every balance query must skip, and would have to follow edits, deletes, re-imports and revaluation. Classifying by type matches the portfolio totals, and net is the same. Realised gain depends on the cost-basis method and is not cash earned in the period, so it stays in the portfolio; trade commissions stay inside cost and proceeds as decided on 2026-09-19
- **2026-09-20.** Investment amounts appear in a category breakdown as an extra `CategoryBreakdownItem` with `categoryId` null and the new optional `syntheticGroup` (`investmentIncome`, `investmentTaxesAndFees`); the report gained `incomeByCategory` because the breakdown was expense-only and investment income had nowhere to go
  - Rejected: A separate `investmentIncome` and `investmentExpense` pair of numbers on the response; seeded system categories that the user could rename or delete; a localized name from the server
  - Why: Both changes are additions, so a client of the older shape still parses the response and treats the item like uncategorized spending with an English name. A pair of numbers would leave the breakdown not adding up to the total. The API does not know the viewer's language, so the client names the group from `syntheticGroup`
- **2026-09-20.** `SecurityPrice` keeps one price per security and date, and `Security.LastPrice` stays as the denormalized newest point that only moves when the written date is not older than the one already stored
  - Rejected: Replacing `LastPrice` with a lookup into the history; a price per user; recording every trade price as the price of its day
  - Why: Every holding value, account balance, dashboard total and net worth reads the last price, and a subquery per position on those paths costs more than one column that the single writer, `SecurityPriceBook`, keeps correct. A trade price is what one person paid in one moment, not the day's close, so recording it would move everybody's holdings to a stranger's fill
- **2026-09-20.** The portfolio's value over time is computed per request from the ledger and the price history, sampled daily up to 92 days, weekly up to 731 and monthly beyond
  - Rejected: Storing a daily portfolio value row; sampling daily over any range; reusing net worth snapshots
  - Why: A stored series would have to be rewritten whenever an entry, a price, a rate or the reporting currency changes, which is the same argument that keeps holdings uncached. Daily points over ten years is thousands of replays for a chart a few hundred pixels wide. Net worth snapshots start when the installation did, mix in accounts, assets and debts, and cannot be split back out
- **2026-09-20.** A point whose position has no price yet, no exchange rate, or an oversold replay is left out of that point's value and the point is marked `isPartial`
  - Rejected: Failing the whole request; carrying the last known value forward; showing the point as zero
  - Why: History that starts mid-way is the normal case for an imported account, so a hard failure would leave the chart unusable exactly where it is most wanted. A flag lets the client mark the incomplete part instead of drawing a line that silently understates or invents a value
- **2026-09-19.** Broker splits take their ratio from the `SPLIT n FOR m` text of the corporate action description; a split without that text is skipped and surfaces through the position check
  - Rejected: Deriving the ratio from the quantity change and the replayed holding; asking the user for the ratio during import
  - Why: The Flex row has no ratio field. The quantity change only gives the ratio when the application knows the whole holding, which is false for history that starts mid-way, and it would book a wrong ratio without any sign. The description states what the issuer announced. An import that stops to ask questions cannot run as the daily sync
- **2026-09-19.** Splits replay before the buys and sells of their own day
  - Rejected: Keeping creation order between buys and splits
  - Why: A broker import writes a split and the trades of its effective day with the same creation time, so the old order was undefined exactly where it mattered; trades on that day are in new shares
- **2026-09-19.** Shared securities: an administrator changes the details, and the last price is set through its own operation by an administrator or by a user who currently holds the security on a visible account; adding a security stays open to everyone
  - Rejected: Administrator-only for every write; a price override per user
  - Why: Any signed-in user could rename or reprice an instrument in everybody's portfolio. Administrator-only would break the "click a holding's price" flow for ordinary members, who are the ones who know the price. A per-user price needs a new table and a second valuation path through holdings, account totals and net worth for a value that is the same for every holder
- **2026-09-19.** The yearly and total Fees figure of the portfolio holds standalone fee entries only
  - Rejected: Adding the commission of every buy and sell to it as well
  - Why: A commission is already inside the cost basis or the proceeds, so it already lowers the realised gain; listing it again as a fee made the same money reduce the result twice
- **2026-09-19.** A collision on the unique security index during a broker import rolls the import back and runs it again, up to three times
  - Rejected: One installation-wide lock around security creation; catching the error only on the sync path
  - Why: The retry lives in `ImportAsync`, which upload and sync share, and also covers a security added by hand at the same moment. A global lock would serialize every import for a collision that almost never happens
- **2026-09-19.** No cache of holdings values across requests; one projected query per request and a request-scoped memo instead
  - Rejected: A memory cache keyed by account and invalidated on writes
  - Why: The value depends on entries, splits, security prices, broker imports, restore, the reporting currency and the newest exchange rate. Missing one invalidation would show a wrong balance, and money figures must not be stale
