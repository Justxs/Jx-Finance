# Plan: Asset value history and depreciation

Implemented 2026-09-27; see [Net worth](../features/net-worth.md#asset-value-history). The feature page describes what shipped; this plan is kept as the record of intent.

Status: planned 2026-09-26. Size M. Independent of the other plans.

## Outcome

An asset keeps a dated list of valuations instead of one overwritten number:

- **A flat** is revalued by hand now and then.
- **A car** gets a straight-line depreciation. Its value falls by a fixed amount each month towards a residual value, and every manual valuation (an inspection, a dealer quote) restarts the decline from that figure.

Each asset has a page with its value over time, its valuations and, when it depreciates, the monthly amount and the date it reaches its residual. Net worth uses the value on today's date.

## Today

- An `Asset` has `Name`, `Type`, `CurrentValue` (in the reporting currency at creation) and `AsOf`, and nothing else.
- `NetWorthService.ComputeTotalsAsync` ignores `AsOf`, although `CreateAssetSummary` says the value counts from that date.
- `AsOf` may be in the future.
- `HoldingsSection` adds asset values in different currencies without converting them.
- Asset mutations do not refresh the net worth history query.

This plan fixes all four in passing.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Storage | A new `AssetValuation` table, one row per asset and date, with a composite key and a cascade from the asset. `Asset.CurrentValue`/`AsOf` become the denormalised newest valuation, kept in step through one static `AssetValuationBook`, like `SecurityPriceBook` | Overwriting `CurrentValue` as today | The same shape as the security price history, which already works: same-date writes replace, and deleting the newest falls back to the next |
| Depreciation | Straight line in whole monthly steps on the start date's day of month, never below the residual. Terms are optional: start date, start value, useful life in months (1 to 600) and residual value | Daily pro rata; declining balance | Monthly steps give amounts in cents that a person can check by hand. Declining balance can come later as a second method |
| Revaluation during depreciation | A manual valuation on or after the start date restarts the decline from that value at the same monthly amount, `(start value − residual) / life` | Ignoring manual valuations while depreciating; recomputing the rate from the new value | An inspection says what the car is worth now. The loss per month is a property of the car, not of the latest guess |
| Where the value comes from | Computed on read by a pure `AssetValue.On(date, valuations, terms)` for net worth, the list and the chart. Depreciation writes no rows | A job writing a monthly valuation row | The debt schedule set the precedent: computed per request, never stored. Edited terms apply at once, with nothing to rewrite. Net worth snapshots still record what the value was each day |
| Net worth history | Snapshots already taken are not rewritten when a valuation is added for a past date | Recomputing past snapshots | Unchanged rule from [Net worth](../features/net-worth.md): snapshots are the history as it was seen |
| Counting from the first valuation | An asset counts in net worth only on or after its earliest valuation date, and valuation dates cannot be in the future | Keeping `AsOf` ignored | Makes the summary text true. With no future dates, today's total is unaffected except for the fix itself |

## Data model

| Change | Detail |
| --- | --- |
| New `AssetValuation` | `AssetId`, `Date`, `Value` (decimal 18,2, in the asset's currency), `Note?` (max 200, for example "dealer quote"). Composite primary key `(AssetId, Date)` and cascade delete from `Asset`, overriding the Restrict convention. Not an `EntityBase`, so it has no soft delete: an asset in the trash keeps its valuations untouched |
| `Asset.Depreciation?` | Complex type, all columns nullable: `StartDate`, `StartValue`, `LifeMonths`, `ResidualValue` |
| `Asset.CurrentValue`, `AsOf` | Kept as the newest valuation, so older readers and backups stay valid |

Migration `AddAssetValuations` backfills one valuation per asset from `CurrentValue`/`AsOf`. That backfill is a single `INSERT … SELECT` in the migration, tested like `SecurityPriceBackfillTests`.

## Backend steps

1. **Pure rules.** `Common/Assets/AssetValue` has:
   - `On(date, valuations, terms)`, which returns the value, or null before the first valuation;
   - `MonthlyAmount(terms)`;
   - `FullyDepreciatedOn(valuations, terms)`;
   - `Series(from, to, valuations, terms)`, sampled daily, weekly or monthly like `GetValueHistoryAsync`, plus every valuation date.
   Unit-test them with theories:
   - before the start;
   - on the start;
   - month-end start days (the 31st on 28 February);
   - reaching the residual;
   - a revaluation above and below the line;
   - a revaluation before the start date;
   - a residual equal to the start value;
   - zero life, which the validator refuses.
2. **Book.** `AssetValuationBook.Record(asset, date, value, note)` and `Remove(asset, date)` update the denormalised fields. Removing the only valuation is refused with `asset.lastValuation`.
3. **Asset create and update.** The form's value and date write a valuation through the book. On update, a changed value or date is a new valuation for that date rather than an overwrite of history. The validators gain:
   - `IsNotInFuture` on `AsOf`;
   - depreciation rules:
     - a start value above the residual;
     - a residual of zero or more;
     - a life of 1 to 600 months;
     - a start date not in the future;
     - all four present or none (`asset.depreciationIncomplete`).
   `AssetResponse` gains:
   - `Value`, which is `AssetValue.On(today)`;
   - `LastValuation` (date and value);
   - `Depreciation?`;
   - `MonthlyDepreciation?`;
   - `FullyDepreciatedOn?`.
4. **Valuation endpoints** (`NetWorthGroup`, owner-only through the filter, 404 otherwise):
   - `GET /api/assets/{id}/valuations`: newest first.
   - `PUT /api/assets/{id}/valuations/{date}` with `{ value, note? }`: upsert. A unique violation becomes 409 `conflict.busy`, as for prices.
   - `DELETE /api/assets/{id}/valuations/{date}`.
   - `GET /api/assets/{id}/value-history?from&to`: returns the series with `IsValuation` marking real points.
5. **Net worth.**
   - `ComputeTotalsAsync` loads each asset's valuations (one query, grouped in memory, since assets are few per user) and sums `AssetValue.On(clock.Today)` per currency.
   - `NetWorthSnapshotter` builds `NetWorthService` by hand. Update it with any new dependency, and add a test that the job's total equals the endpoint's.
6. **Trash and retention.** Asset delete and restore are unchanged, because valuations are untouched by a soft delete. `Retention.PurgeDeletedAsync` hard-deletes the asset and the cascade takes its valuations. Check the purge order test still passes.
7. **Demo data.** In `DemoDataCommand`:
   - a car with depreciation over 8 years and one inspection revaluation;
   - a flat with three valuations over two years.

## Frontend steps

1. `just gen`. Add the valuation mutations to `invalidation.ts` against assets, net worth, net worth history and the asset's value history. Asset create, update and delete also refresh net worth history now.
2. **Assets list.** The row shows the computed value and a small "↓ 95.00 per month" for depreciating assets. A link icon opens the asset page, like `scheduleLink` on debts. `HoldingsSection` totals are summed per currency, and several currencies are shown as one line each instead of an unconverted sum.
3. **Asset form.** A collapsible "Depreciation" group with start date, start value (defaulting to the value), life in years and months, and residual value, plus a live preview line: "Loses 95.00 a month, reaches 1 500.00 in March 2032".
4. **Asset page.** Route `routes/net-worth_.assets.$assetId.tsx`, following the debt page:
   - a summary: value today, last valuation, monthly depreciation and fully depreciated date;
   - a value chart: `TimeSeriesLineChart` with the valuation points marked;
   - a valuations list with add, edit and delete, reusing the `PriceHistory`/`PriceForm` pattern, with a "today or earlier" check. Deleting a valuation is a hard delete with a confirmation and no undo, as for prices.
5. **Stories.**
   - The asset page: depreciating, manual only, fully depreciated, a single valuation, pending and `failWith`.
   - The form with and without depreciation.
   - The list with several currencies.
   - Fixtures in `storybook/fixtures/net-worth.ts` and handlers in `handlers/net-worth.ts`.

## Tests

- **Integration:**
  - Creating an asset writes one valuation, and updating the value on a new date adds a second.
  - Same-date writes replace. Deleting the newest falls back to the next, and deleting the last is refused.
  - A future date is refused.
  - Net worth uses the depreciated value today.
  - An asset whose first valuation is after the date does not count in that total.
  - The value history series matches the rule.
  - Another user gets 404.
  - A trash round-trip keeps valuations, and the purge removes them.
  - A backup round-trip keeps valuations and depreciation.
  - The migration backfill.
  - The snapshot job agrees with the endpoint.

## Docs

- `docs/features/net-worth.md`: a new "Asset value history" section with the depreciation rule and a worked example. Also note that valuations for past dates do not rewrite snapshots.
- `docs/decisions/net-worth.md`: the rows above.
- `docs/scope.md`.
- `docs/data-model.md`.
- `docs/features/backup-and-restore.md`: no change needed beyond a sentence, since new tables are included automatically.

## Later, not in this plan

- Declining-balance depreciation.
- Appreciation, meaning a fixed yearly growth rate for a flat.
- An asset bought with a transaction and linked to it.
- Recomputing net worth history from valuations for days with no snapshot.
