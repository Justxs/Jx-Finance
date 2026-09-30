# Plan: Live security prices

Status: planned 2026-09-30, reviewed against the code the same day. Size M. It fills the existing price history of held securities once a day from a market-data source, and adds a price file import that needs no outside connection at all. Behind the existing `Investments` switch, with the outside connection off until an administrator turns it on. Build after nothing.

This is the one plan here whose purpose needs an outside service: nobody can compute a closing price inside the house. It follows the rule the rate sync and the Interactive Brokers connection set in `PRODUCT.md`:
- the server, never the browser, makes the request,
- an administrator switches it on,
- the ledger works without it.
The provider learns which securities the installation holds (the symbols), never quantities, amounts or who holds them. The docs say so where the switch is.

## Outcome

- **Setting.** Settings › Installation gains a **Market prices** section, listed while the investments feature is on, with:
  - the switch "Fetch closing prices daily", off by default;
  - an EODHD API key field, write-only and stored encrypted;
  - **Fetch now**;
  - the time of the last run and the provider calls left today;
  - a list of securities whose last fetch failed, with the provider's reason.
- **What is fetched.** With the switch on, the server fetches the missing closing prices of every security someone holds, has a price source, and has no price for the last weekday before today. It fills any gap since that security's last price.
  - Stocks, ETFs and funds come from **EODHD**, which covers Xetra, Euronext, the London Stock Exchange, US exchanges and funds by ISIN.
  - Crypto priced in EUR comes from **Kraken**'s public prices and needs no key.
- **Mapping a security.** The security form gains **Price source** (None, EODHD, and Kraken for EUR crypto) and **Price symbol**, such as `VWCE.XETRA` or `XBTEUR`. Only administrators see and change them.
  - A **Find** button asks EODHD for the security's ISIN once and lists the candidates.
  - Setting a source backfills history from the first trade in that security, as far as the provider allows: one year on EODHD's free tier.
- **Other prices win.** A price typed by hand, written by the broker import or imported from a file is never overwritten by a fetched one for the same day.
- **Price file import.** In a security's price history, **Import prices** reads a CSV with `date` and `price` columns. It works with the switch off and makes no outside request, for someone who takes prices from anywhere by hand.
- **Net worth.** The value chart, account balances, net worth and the snapshots stop being incomplete for want of a price on a normal weekday.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Securities provider | EODHD with an administrator's API key | Yahoo Finance's unofficial chart API; Stooq; Alpha Vantage; Twelve Data, Finnhub, Tiingo, FMP, Marketstack, Massive | Yahoo has had no official API since 2017, its terms forbid automated access, and it broke again in September 2026. Stooq now needs a key obtained through a captcha, and its EU coverage is patchy. Alpha Vantage allows 25 calls a day and only 100 days of history. The others' free plans are US-only or tiny. EODHD covers EU exchanges, the US and funds by ISIN under a personal-use licence. Its free tier (20 calls a day, one year of history) fits a household portfolio, and its €16.66 a month plan gives 30 years of history |
| Crypto provider | Kraken's public OHLC endpoint, for crypto securities whose currency is EUR | CoinGecko; Coinbase | Kraken is documented, keyless, gives about two years of daily candles and quotes in EUR. CoinGecko's free key requires attribution and a monthly quota. A crypto security in another currency uses EODHD or a price file |
| ISIN lookup | EODHD's search endpoint, called only when an administrator presses Find | OpenFIGI; automatic lookup on save | It is the provider that will be asked for the prices, so its code is the right one. Only on demand, because each lookup is one of the daily calls |
| Mapping | `Security.PriceSource` and `Security.PriceSymbol`, set by administrators. A member creating a security leaves them at None; a non-None value from a non-administrator answers `access.forbidden` | Anyone who creates a security may map it | Securities are installation-wide, and only administrators change their details (`docs/decisions/investments.md`, 2026-09-19). A mapping decides what the server asks an outside service |
| Price precedence | `SecurityPrice.Source` (`Manual`, `Broker`, `Feed`, `File`). A `Feed` price never replaces a `Manual`, `Broker` or `File` price of the same date, and a refused feed write does not move `LastPrice`. A hand, broker or file price replaces a `Feed` one | Last writer wins | The broker's mark and a typed price are the member's own statement of value. A feed is a fallback |
| Call budget | A daily counter of EODHD calls (`PriceCallsDate`, `PriceCallsUsed` on the settings row), refusing further EODHD calls once `MarketPriceOptions.EodhdDailyLimit` (default 20) is reached. A security whose last fetch failed waits 24 hours before it is tried again. Kraken is not counted | A per-run cap | Runs every 6 hours with a per-run cap would spend four times the free daily limit. A counter survives restarts and covers Fetch now and Find |
| Schedule | `PriceSyncJob`, a `PeriodicJob` every 6 hours, fetching only stale securities, oldest first | A fixed wall-clock time | `PeriodicJob` counts from process start and has no wall-clock schedule. Asking only for stale securities makes repeated runs cost nothing |
| Currency | The provider's currency must match `Security.Currency`; `GBX` is divided by 100 into `GBP`. A mismatch is a failure on that security | Converting through exchange rates | A price in the wrong currency means a wrong mapping, and converting would hide it |
| The key | Kept like the SMTP password: `InstanceSettings.EodhdProtectedKey`, protected with `ProtectedSecret.Protect` under its own purpose, written only through its own `PUT /api/settings/market-prices`, masked in the request's `PrintMembers`, never in any response. Telemetry redacts the key from recorded URLs, as it redacts Discord webhooks | A field in `UpdateSettingsRequest` | The general settings form sends the whole request, and `GET /api/settings` is readable by every member |
| Failures | Stored on the security (`PriceSyncError`, `PriceSyncedAt`) and listed in the settings section; a warning in the log; no notification | Notifying administrators | The rate sync logs and moves on. A stale price is visible where it matters: the price date shown next to every price |
| Price file | One security per file: `date` and `price` columns, dot or comma decimals, at most 5 MB. It is written through the price book with `Source = File`, under the existing rule (an administrator, or a member who holds the security). Unreadable lines are counted, not fatal, like the broker trade CSV | A multi-security file with an ISIN column | One security per file matches the route and the holder rule. A file of several securities would need a holder check per row for little gain |
| Member export | `Security.PriceSyncError` and `PriceSyncedAt` are hidden columns. The member import clears `PriceSource` and `PriceSymbol` on securities it inserts | Carrying the mapping across installations | A mapping is an administrator's choice for this installation and spends its key |

## Data model

| Change | Detail |
| --- | --- |
| `Security.PriceSource` | `PriceSource` enum (`None`, `Eodhd`, `Kraken`) stored as text, default `'None'` |
| `Security.PriceSymbol` | `string?`, at most 32 characters; check constraint: not null when `PriceSource <> 'None'` |
| `Security.PriceSyncedAt`, `Security.PriceSyncError` | `DateTimeOffset?`; `string?` of at most 200 characters |
| `SecurityPrice.Source` | `PriceSourceKind` enum (`Manual`, `Broker`, `Feed`, `File`) stored as text, default `'Manual'`; existing rows migrate as `Manual` |
| `InstanceSettings` | `PriceSyncEnabled` (`bool`, default false, seeded from `MarketPriceOptions.Enabled`); `EodhdProtectedKey` (`string`, default `""`); `PriceSyncRunAt` (`DateTimeOffset?`); `PriceCallsDate` (`DateOnly?`); `PriceCallsUsed` (`int`, default 0) |
| Migration | `just migrate-add AddMarketPrices` |

## Backend steps

1. **Options.** `AppOptions` gains `MarketPriceOptions { Enabled, EodhdBaseUrl, KrakenBaseUrl, EodhdDailyLimit }`, like `ExchangeRateOptions`.
2. **Providers.** `Infrastructure/MarketPrices/`:
   - `IMarketPriceProvider` has `Source`, `CloseAsync(symbol, from, to, ct)` returning `IReadOnlyList<(DateOnly Date, decimal Close, string Currency)>`, and `FindAsync(isin, ct)` returning candidates.
   - `EodhdPriceProvider` uses `/api/eod/{symbol}?from=&to=&fmt=json` and `/api/search/{isin}`. `KrakenPriceProvider` uses `/0/public/OHLC?pair=&interval=1440&since=`.
   - Both are registered as concrete typed clients in `ApiServiceExtensions` (20-second timeout, `JxFinance/1.0` user agent, `.RemoveAllLoggers()`), then registered as `IMarketPriceProvider` and resolved by `Source` from `IEnumerable<IMarketPriceProvider>`.
   - `TelemetryExtensions` gains a redactor for the EODHD host that drops the `api_token` query value, like `RedactDiscord`.
3. **Held securities.** `Common/Holdings/HeldSecurities.cs` answers the ids of securities with a non-zero position on any account, reading entries with `IgnoreQueryFilters(QueryFilters.OwnerOnly)`, as `BrokerSyncJob` does.
4. **Price book.** `SecurityPriceBook.RecordAsync` and `Record` gain the source and the precedence rule. The three writers pass it:
   - `SecurityPriceService.SetPriceAsync`: `Manual`;
   - `InvestmentService`'s security save: `Manual`;
   - `StatementImport.UpdatePricesAsync`: `Broker`.
   The broker trade CSV import writes no prices, as today.
5. **Sync service.** `Endpoints/Investments/Interfaces/IPriceSyncService.cs` and `Services/PriceSyncService.cs`:
   - `SyncAsync(force, ct)` takes the held, mapped securities whose price is stale, skipping those that failed in the last 24 hours unless `force` is set, oldest first.
     - For each, it checks the budget, fetches from the day after its last price (or from its first trade for a first backfill), checks the currency, and writes through the price book with `Feed`.
     - It stores `PriceSyncedAt` and `PriceSyncError`, then `PriceSyncRunAt`.
     - It answers `MarketPriceSyncResponse(int Checked, int Written, int Failed, int CallsLeft)`.
   - `FindSymbolAsync(securityId, ct)` answers the EODHD candidates.
6. **Job.** `Infrastructure/BackgroundJobs/PriceSyncJob.cs` is a `PeriodicJob` with `Interval = 6h` and `RequiredFeature = Investments`. It does nothing while `PriceSyncEnabled` is off. It runs in a transaction holding `AppLock.PriceSync`, a new value in `Common/AdvisoryLock.cs`.
7. **Endpoints.**
   - **Settings group, administrators only:**
     - `GET /api/settings/market-prices` answers `MarketPriceSettingsResponse(bool Enabled, bool HasKey, DateTimeOffset? LastRunAt, int CallsLeft, IReadOnlyList<PriceSyncFailure> Failures)`, with `PriceSyncFailure(Guid SecurityId, string Symbol, string Name, string Reason, DateTimeOffset At)`.
     - `PUT /api/settings/market-prices` takes `UpdateMarketPriceSettingsRequest(bool Enabled, string? EodhdApiKey)`. Null keeps the key and an empty string removes it. `PrintMembers` masks the key.
     - `POST /api/settings/market-prices/sync` is Fetch now and answers `MarketPriceSyncResponse`.
   - **Investments group:**
     - `POST /api/investments/securities/{id:guid}/price-symbol/find` is for administrators. It answers `IReadOnlyList<PriceSymbolCandidate(string Symbol, string Exchange, string Name, string Currency)>` and saves nothing.
     - `POST /api/investments/securities/{id:guid}/prices/import` takes multipart `File`, with `AllowFileUploads()` and a 5 MB limit like `ImportTradeCsvEndpoint`, under the price-writing rule. It answers `PriceImportResponse(int Written, int Skipped, int Unreadable)`.
   - **Existing requests and responses:**
     - `SaveSecurityRequest` gains `PriceSource` and `PriceSymbol`.
     - `SecurityResponse` gains `PriceSource`, `PriceSymbol` and `PriceSyncError`.
     - `SecurityPriceResponse` gains `Source`.
8. **Validation and error codes.**
   - A symbol missing for a source other than None answers the existing `required`.
   - A mapping set by a non-administrator answers `access.forbidden`.
   - Kraken on a non-crypto or non-EUR security answers `range.invalid`.
   - New codes, with English and Lithuanian text, following the broker connection's codes:
     - `marketPrices.keyRequired`: EODHD mapping, Find or Fetch now with no key;
     - `marketPrices.keyUnreadable`: a key restored under another data-protection key ring;
     - `marketPrices.unavailable`: the provider could not be reached;
     - `marketPrices.rejected`: the provider refused, with its words in the message.
   - The price file uses the existing `import.invalidFile` and `import.missingColumns`.
9. **Export and import.**
   - `UserExportTables` hides `PriceSyncError` and `PriceSyncedAt` on `Securities`. `SecurityPrices` stays excluded.
   - `MemberImport` clears `PriceSource` and `PriceSymbol` on securities it inserts.
10. **Tests support.** `ApiFixture` removes both provider registrations and adds `FixedPriceProvider` fakes for each source, as it replaces `IExchangeRateProvider`.

## Frontend steps

1. `just gen`. In `src/api/invalidation.ts`:
   - Fetch now and Import prices invalidate the `holdings` group (investments, value history, accounts, net worth).
   - The market-price settings `PUT` invalidates `/api/settings` and itself.
   - Find joins `mutationsWithoutInvalidation`.
   - Security saves already refresh `getSecuritiesQueryKey`, which covers the price history by prefix.
2. **Settings.** `components/settings-layout/settings-layout.tsx` gains a `marketPrices` section id with an icon and label, shown only while `features.investments` is on. `settings-page.tsx` renders `features/settings/market-prices-section/market-prices-section.tsx`, built like `SmtpSection`:
   - the switch;
   - the key field, showing "Key saved" with Replace and Remove when `hasKey`;
   - Fetch now with a pending state and a toast of the result;
   - the last run and calls left;
   - the failures table in a `ScrollRegion` for phones, with an empty text "No failures";
   - a paragraph stating what the provider learns.
3. **Security form.** `features/investments/security-form/security-form.tsx` shows Price source and Price symbol to administrators only. Kraken is offered only for EUR crypto. Find is disabled without a key, lists the candidates in a popover, fills the symbol on choice, and shows provider errors inline.
4. **Price history.** `features/investments/price-history/price-history.tsx` shows each price's source as a small tag. It gains **Import prices**, a file input showing written, skipped and unreadable counts after the import.
5. **Text.** English and Lithuanian keys:
   - `settings.sections.marketPrices`,
   - `marketPrices.enabled`, `.key`, `.keySaved`, `.replace`, `.remove`, `.fetchNow`, `.lastRun`, `.callsLeft`, `.failures`, `.noFailures` and `.privacy`,
   - `investments.priceSource.none`, `.eodhd`, `.kraken`, `.symbol` and `.find`,
   - `investments.priceSourceKind.manual`, `.broker`, `.feed` and `.file`,
   - `investments.importPrices` with its result sentence,
   - `serverErrors` for the four new codes.
6. **Stories.**
   - `market-prices-section`: off; on with a key; on without a key; failures; no failures; pending; `failWith` `marketPrices.unavailable`.
   - The security form as an administrator with a source, with Find candidates and with a Find error, and as a member without the fields.
   - The price history with mixed sources and the import result.
   - A `play` that imports a two-line file against MSW.

## Tests

- **Unit:**
  - EODHD and Kraken response parsing from recorded samples, including `GBX`.
  - The precedence rule, including a refused feed write leaving `LastPrice` alone.
  - The daily budget, the 24-hour back-off and the staleness selection.
  - The price CSV parser: dot and comma decimals, bad lines counted.
  - The telemetry redactor.
- **Integration:**
  - **Sync:**
    - With the switch off, the job writes nothing and calls no provider.
    - With it on, a held, mapped security gets its missing days.
    - A security nobody holds is skipped.
    - A hand price on the same date is kept.
    - A currency mismatch stores `PriceSyncError` and writes nothing.
    - The 21st EODHD call on one day is not made.
  - **Settings and access:**
    - The key is never in any response.
    - A non-administrator gets 403 on the settings routes, sync and Find, and on a mapping in `SaveSecurityRequest`.
    - A backup restored under another key ring answers `marketPrices.keyUnreadable`.
  - **Price import:** it works with the switch off under the holder rule.
  - **Member export:** it hides the sync columns, and the import clears the mapping.
  - **Downstream:** the value history is no longer partial after a sync.

## Docs

- A new `docs/features/live-prices.md` and a row in `docs/features/README.md`, covering the sources, the schedule, the budget, precedence, the file import and what the provider learns.
- `docs/decisions/investments.md`: a Log entry with the rejected providers and why. Update the Current section, where "no market data feed" no longer holds.
- `PRODUCT.md`: the outbound connections gain the price providers, and the out-of-scope list drops "live investment prices".
- Architecture: `docs/architecture/investments.md` (providers and precedence) and `docs/architecture/backup-and-restore.md` (the new protected secret).
- Features: `docs/features/background-jobs.md` (the job), `docs/features/installation-settings.md` and `docs/features/data-export-per-user.md` (hidden columns, cleared mapping, and that older exports cannot be imported after the migration).
- `docs/data-model.md`, `docs/api.md` and `docs/scope.md`, including its out-of-scope line.
- `docs/backlog.md`: move the "Live investment prices" row to Done.

## What must be true to ship

1. With a free EODHD key, a portfolio of 10 EU ETFs and 2 EUR-priced coins has a price for every weekday of the last month within two days of turning the switch on, without passing 20 EODHD calls on any day.
2. With the switch off, the installation makes no request to either provider (checked in the request log).

## Open questions

None.
