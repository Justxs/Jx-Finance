# Plan: Double-entry journal

Status: planned 2026-09-30, reviewed against the code the same day. Size M. This plan deliberately does **not** turn the database into a double-entry ledger. It writes the member's books out as a balanced double-entry journal in the Beancount format and checks that the journal balances and agrees with the app. That gives the two things double-entry is for, without rewriting the core: proof that every amount has a counterpart, and a balance sheet a standard tool can read. See the first decision. Build after nothing. It extends the [data export per user](../features/data-export-per-user.md).

## Outcome

- **Download my data** in Settings › Personal › Import and export adds `ledger.beancount` to the zip. It is a plain-text double-entry journal of the member's own live accounts and everything on them, the same rows the export's CSV files hold, plus their assets and debts.
- Opening it in Fava, or running `bean-check ledger.beancount`, shows two things:
  - a balance sheet of those accounts, assets and debts,
  - an income statement of the member's categories, nested under their parent categories.
  Every transaction's postings sum to zero.
- The journal ends with a `balance` assertion for every account and currency, and for every holding's quantity. Each asserts the balance of rows dated up to today, the figure the app computes for the account. If Beancount accepts the assertions, the journal and the app agree to the cent.
- The balance sheet covers the member's own accounts only. The app's net worth also counts accounts a household shares with them, so the two totals can differ, and the section says so.
- Adding the file does not affect **Import my data**: the member import reads only `data.json` and the attachments, and ignores other entries.
- The same writer runs in the backend tests over the seeded ledger. A change that breaks the balance of any movement fails CI instead of surfacing in a spreadsheet later.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Double-entry storage | Keep today's model: single-sided transactions with typed transfers, conversions and investment entries, balances computed by `AccountMovements` | Replacing `Transaction`, `Transfer`, `CurrencyConversion` and `InvestmentTransaction` with journal entries and postings | Every feature reads the current shapes, and a rewrite buys no figure the app does not already compute exactly. Those readers include: the six arms of `AccountMovements`; `CategoryAttributionService`; splits and refunds; trash restores; the audit log; settle-up; debt payments; the month-close snapshot; the member export and import. Transfers and conversions are already two-sided records, and a transaction's other side is its category, so the model is double-entry in all but storage. The journal makes that explicit and checkable |
| Format | Beancount v3 syntax | hledger or ledger-cli journal; a JSON of postings | Beancount is the strictest of the three: it refuses an unbalanced transaction and a failed assertion. Fava gives a complete browser interface on top of the file, and hledger reads a large subset of it. A JSON of postings has no tool to check it |
| Rows | Live rows on the member's live accounts: transactions and transfers as the export's CSV files read them, and currency conversions and investment entries through the same `OnOwnedAccounts(AccountId)` predicates `UserExportTables` uses. Plus the member's assets, debts and debt payments. Everything is read inside the export's RepeatableRead transaction and ignores the query filters the way the export does, so the household switcher changes nothing. Assets and investments are included whatever the `NetWorth` and `Investments` switches say, as in `data.json` | Reading `data.json`'s table dump; reusing `AccountMovements.SumAsync` | `data.json` includes trashed rows and archived accounts. `SumAsync` runs through the global query filters, which the active household narrows. The export promises the switcher changes nothing (`The_active_household_does_not_change_the_export`) |
| The other side of a transfer | A transfer to or from an account outside the export is posted against `Equity:Outside-Accounts:<Name>`. That covers a partner's account, an archived one, and the transfer of a settle-up payment | Treating the partner's account as the member's asset; leaving the transfer out | Money moved to someone else's account left the member's books without being spent. An equity account keeps the income statement unchanged and names where it went. Settle-up receivables are not modelled, because the app does not count them in net worth either |
| Account names | `Assets:Bank:` (Checking), `Assets:Savings:`, `Assets:Cash:`, `Assets:Other:`, `Assets:Investments:` for accounts; `Assets:Owned:<AssetType>:` for assets; `Liabilities:Debts:`, `Income:<Parent>:<Category>`, `Expenses:<Parent>:<Category>`, `Equity:Opening-Balances`, `Equity:Revaluation`, `Equity:Outside-Accounts:` | Using ids as names | Names are transliterated to ASCII (ą→a, č→c, ė→e, …), with other characters turned into `-`, a `-2` suffix on collision, and the original name kept as `name:` metadata on `open`. Beancount components must start with a capital letter or digit and are safest in ASCII. Readable names are the point of opening the file in Fava |
| Investment cost | A buy posts the lot at its total cost `{{−CashAmount CUR}}`, and the cash leg posts the signed `CashAmount`. A sell posts `−quantity SYMBOL {}` at `@ price`, the signed `CashAmount` as cash, and interpolates `Income:Investments:Gains`. Other investment entries post the signed `CashAmount` against their income or expense account | A fee expense on buys; cash computed from quantity × price + fee | The app capitalises the fee into cost (`Portfolio`), and broker imports store `CashAmount` with costs and taxes that quantity × price + fee does not reproduce. Posting `CashAmount` keeps the cash leg equal to `AccountMovements`, and total cost keeps realised gains equal to the app's |
| Lot booking | `option "booking_method" "FIFO"`. An account whose replay reports an oversold sale opens with booking `"NONE"`, which the file names in that account's metadata | FIFO everywhere | The app allows an oversold position (`Position.FirstOversoldSale`), while Beancount's FIFO reduction refuses one |
| Debt payments | A payment linked to a debt that tracks payments posts the principal worked out by `DebtBalance.Track` to the liability, and the rest to its categories. For a split payment, the principal is taken from the lines in proportion. A payment in another currency uses `@@` at its frozen rate. Payments on or before the debt's `AsOf` count wholly as spending, as they do in the app | Posting the whole payment to the category, as the app's reports do | In double-entry, repaying principal is not spending. This is the one place where the journal's income statement differs from the app's reports, on purpose. Each such transaction carries `jx-category-amount:` metadata with the app's figure |
| Prices | `price` directives for the rate implied by `ReportingAmount / Amount` on each foreign-currency transaction's date, and one `price` per held security: its `LastPrice` on `LastPriceDate`, the figure the app values the holding with | Exporting the exchange-rate and security-price tables | The export leaves out installation-wide market data (`UserExportTables`). One last price per security the member holds is the single exception, recorded in the decision, because without it Fava cannot value the holdings the way the app does |
| Text | Narrations, payees and metadata strings escape `\` and `"` and turn line breaks into spaces. The payee is the member's payee name when one is set (`PayeeNameLookup`), otherwise none. `Note` becomes `note:` metadata | Writing the bank text as the payee | Beancount's payee groups rows in Fava. The payee name is the member's own word for the shop, and the bank text stays in the narration |
| Tracked debt payments in reports | The app's reports keep counting a tracked debt payment in full; only the journal separates the principal | Changing the app's reports to match | The reports answer "where did the money go", and the principal did leave the account. The journal answers "what did it cost". Each such transaction carries the app's figure in `jx-category-amount:` |
| Scope | One journal per member, in the member export | A per-household journal for an administrator | Household data belongs to every member of the household, and the member export deliberately leaves households out (`UserExportTables`) |
| Checking | A C# checker in the tests that parses the generated subset of Beancount and fails on an unbalanced transaction or a failed assertion. `bean-check` is a manual step in the verification notes | Running Python `bean-check` in CI | The C# checker catches the same errors without a Python toolchain in the runner |

## Mapping

| Record | Postings |
| --- | --- |
| Account | `open` dated the earlier of its creation date and its first row. The starting balance is posted against `Equity:Opening-Balances` on that date. Income, expense and equity accounts open on the journal's earliest date |
| Header | `option "title" "Jx Finance – <member name>"`, `option "operating_currency" "<reporting currency>"` and `option "booking_method" "FIFO"` |
| Expense | Account −amount; `Expenses:…` +amount, one posting per split line; with no category, `Expenses:Uncategorized` |
| Refund | The same with the negative amount, so the category posting is negative |
| Income | Account +amount; `Income:…` −amount |
| Transfer | From account −sent; to account +received, with `@@ sent` when the currencies differ; an outside side goes to `Equity:Outside-Accounts:<Name>` |
| Currency conversion | The same on one account in two currencies; its fee is the ordinary expense it already is |
| Investment buy and sell | As in the cost decision, in `Portfolio.InOrder` order: split, then the other entries, then sells, then creation time on the same day |
| Dividend, interest, withholding tax, fee | Cash posting of the signed `CashAmount`; `Income:Investments:Dividends`, `:Interest`, `Expenses:Investments:Taxes` or `:Fees` takes the other side, so a broker reversal posts with its own sign |
| Stock split | Every open lot of the replay is reduced at its cost and added back at the new quantity with the same total cost, `{{cost CUR}}`, in one balanced transaction |
| Asset | Opening at its first valuation against `Equity:Opening-Balances`; each later valuation, and the depreciation up to today, against `Equity:Revaluation` |
| Debt | Opening at its recorded `OutstandingAmount` on its `AsOf` date against `Equity:Opening-Balances`; tracked payments after `AsOf` as in the decision. The app keeps no history of manual changes to a debt, so the journal starts from the current record |
| Assertions | `balance` dated the day after the export for each account and currency (starting balance plus rows up to today), each holding's quantity, each asset (`AssetValue.On` today) and each tracked debt (`DebtBalance.Track`). A row dated after today is posted after the assertions |

Each transaction carries `jx-id:` metadata, and its narration is the description, so a line in Fava can be found in the app. Commodity names are the upper-cased security symbol. A symbol that is invalid, equals a currency code, or is shared by two securities becomes `X` plus the upper-case id prefix.

## Data model

No schema change. The export's format `Version` stays 1, because `data.json` does not change and the member import ignores the new file.

## Backend steps

1. **Writer.** Pure code in `Common/Journal/`:
   - `BeancountWriter.cs` takes plain records (accounts, transactions with lines, transfers, conversions, investment entries with lot replays, assets with valuations, debts with tracked payments, prices and the expected balances) and writes the text.
   - `BeancountNames.cs` handles transliteration and collisions.
   - `BeancountCommodity.cs` makes symbols into valid, unique commodity names.
   It builds whole lists: lot replay, debt tracking and the collision suffixes all need the full set, and a member's rows fit in memory like the export's CSVs.
2. **Lots.** `Position` exposes its open lots read-only (quantity, total cost, acquisition date). The journal source runs the `Portfolio` replay per account, because positions are keyed by security only.
3. **Source.** `Endpoints/Users/Interfaces/IUserJournalSource.cs` and `Endpoints/Users/Services/UserJournalSource.cs` load:
   - the records described in the Rows decision,
   - the names of every category used by a transaction or a split line, with their parents, ignoring the query filters as `UserExportService`'s name loading does,
   - payee names, and each held security's `LastPrice`,
   - the member's assets and debts, and the debt tracking from `DebtBalance.Track`.
   They compute the expected balances from those same rows, with the rows' dates bounded by today.
4. **Export.** `UserExportService` writes `ledger.beancount` after the CSVs and before `transaction.CommitAsync`, so the journal reads the same snapshot. `UserExportTests.AllText` scans it for secrets like every other entry.
5. **Checker.** `JxFinance.Tests/Support/Journal/JournalChecker.cs` parses what the writer emits: `option`, `open` with a booking method, transactions with postings, costs, `{{ }}` total costs and `@@` prices, `balance` and `price`. It fails on an unbalanced transaction or an assertion that differs.

## Frontend steps

1. `features/profile/export-data-panel/export-data-panel.tsx` adds one sentence under the download button: "Includes a double-entry journal (Beancount) you can open in Fava".
2. English and Lithuanian text for it, as `profile.dataExport.journal` next to the existing `profile.dataExport.download`.
3. The panel's story shows the sentence. No other change.

## Tests

- **Unit:**
  - `BeancountNames`: every Lithuanian letter, collisions and names that start with a digit.
  - `BeancountCommodity`: invalid symbols, a symbol equal to a currency code, and one symbol in two currencies.
  - `BeancountWriter` theories: one per row of the mapping table, each checked by `JournalChecker`.
  - Escaping of quotes, backslashes and line breaks; a payee name as the payee; a note as `note:` metadata.
- **Integration:**
  - **Seeded ledger:** it exports a journal that `JournalChecker` accepts, with every account assertion equal to the balance the accounts page shows for today.
  - **Household switcher:** the export is identical with and without an active household.
  - **Partner's account:** a partner's personal account appears only as `Equity:Outside-Accounts:…`, never as an asset.
  - **Balancing cases**, each accepted by the checker:
    - a refund,
    - a split,
    - a cross-currency transfer,
    - a conversion with a fee,
    - a broker-imported buy whose `CashAmount` includes taxes,
    - a sell across two lots,
    - a split followed by a sell,
    - an oversold account,
    - a tracked debt payment in another currency,
    - a split debt payment.
  - **Member import:** it accepts a zip containing the journal.
  - **Switches:** with `Investments` and `NetWorth` off, the journal still holds the investment entries, assets and debts.
  - **Categories:** a split line's category and its parent appear as `Expenses:<Parent>:<Category>`.
- **Manual, in the verification notes:** `pip install beancount fava`, then `bean-check` and `fava` on an export of the owner's ledger.

## Docs

- `docs/features/data-export-per-user.md`: a **Double-entry journal** section. It covers the mapping table, the outside-accounts equity, the debt-payment difference, the price rule, and why the balance sheet differs from the app's net worth.
- `docs/decisions/exports.md`: a Log entry for the journal as an export, with the rejected storage rewrite, the other formats and the price rule.
- `docs/data-model.md`: one paragraph stating that the model is single-sided in storage and double-entry in the journal, and why.
- `docs/verification.md`: the manual `bean-check` step.
- `docs/scope.md` §Exports.

## What must be true to ship

1. `JournalChecker` accepts the export of the seeded ledger, and `bean-check` accepts it on a developer machine.
2. `bean-check` accepts an export of the owner's real ledger, restored from a backup, with every assertion passing.

## Open questions

None. Reports keep counting tracked debt payments in full, and there is no per-household journal (both in Decisions).
