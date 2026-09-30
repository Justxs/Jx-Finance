# Plan: Transaction locations

Status: planned 2026-09-30, reviewed against the code the same day. Size M for part 1; part 2, the map, is L and gated. It adds a place and optional coordinates to a transaction, behind a new `Locations` switch that is off by default. Build part 1 after the change "Strip GPS metadata from stored attachments", in progress on 2026-09-30, which adds `AttachmentImage.WithoutMetadata`: the photo-location step reads the upload just before that stripping. Build part 2 only when the gate below holds.

The application itself makes no request to an outside service in either part, in keeping with [PRODUCT.md](../../PRODUCT.md) and its fifth principle ("Private and self-contained"). One caveat has to be written down: when the person presses Use my location, the browser or the operating system may ask its own network location service (Google, Apple or Microsoft) to work out the position. That request is the browser's, outside the application's Content-Security-Policy. The docs say so next to the button's description.

## Outcome

Part 1, places:

- **Place field.** The transaction form gains **Place**, a free text field that suggests the places used before, such as "Maxima, Ozo g. 18, Vilnius".
- **Use my location.** Where the page is a secure context (HTTPS or localhost), a **Use my location** button next to the field asks the browser for the position once and stores the coordinates with the row.
  - When a visible earlier place lies within 150 m, it fills that place's name.
  - Otherwise it leaves the name for the person to type and shows "Location saved".
  - On plain HTTP, such as the development Caddy on a phone over the LAN, the button is not shown.
- **Receipts.** **Fill from receipt** fills Place with the merchant and the address line of the receipt. When a freshly uploaded photo carries GPS coordinates, it also offers "Use the photo's location". A receipt read from an attachment stored earlier never offers it, because stored images no longer keep their metadata.
- **Ledger.** The search matches the place, the filters gain **Place** (contains, ignoring case), and the edit dialog shows it. Saved filters and templates keep it. The table gains no column.
- **Report.** Reports gain **Expense by place**, built like expense by payee: the top 50 places with amount and count, and no place as its own group.

Part 2, the map (gated):

- The Expense by place section gains a **Map** view with a dot per place, sized by amount, over a map of Lithuania.
- The map is drawn from a tile file the administrator put on the server.
- Clicking a dot opens the ledger filtered to that place.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| What a location is | A `Place` text and optional `Latitude` and `Longitude` on the transaction | A `Places` table with a name and coordinates that transactions point at | A table needs merge and rename screens and a sharing rule. Suggestions from distinct earlier values give the recall without one. The filter matches by substring, so "Maxima, Ozo g. 18" and "Maxima Ozo" still meet. A table can come later if the text drifts too much |
| Name from coordinates | Nearest visible earlier place within 150 m, computed on the server from the rows the caller can see, narrowed by the active household like every list | Reverse geocoding through Nominatim or any hosted service; only the caller's own rows | A hosted lookup sends the position out of the house. The household's own history knows the shops it goes to, which is what the name is for |
| Browser permission | `Permissions-Policy: geolocation=(self)` in both Caddyfiles; the position is asked for only in the click handler | Leaving geolocation off; asking on form open | The header is what lets the browser ask at all, and it still asks the person. Asking only on the click keeps the prompt tied to an intent and needs no effect |
| Photo location | Read `GPSLatitude`, `GPSLongitude` and their `Ref` tags with Magick.NET in `ReceiptService.LoadUploadAsync`, before the metadata is stripped. Return them in the reading response only, never in the cached `ReceiptReadings.Result`. Offer them; never set them silently | Storing them in the cached result; ignoring them | The cached result travels in backups and the member export, so storing the position there would undo the stripping for a person who declined it. Offered and not set, because a photo taken later at home carries the home position |
| Map tiles (part 2) | MapLibre GL with a PMTiles extract of Lithuania the administrator places in a `maps` volume, served by Caddy from the same origin. MapLibre's worker is a bundled same-origin file set with `setWorkerUrl`, which `script-src 'self'` already allows, so the CSP does not change | OpenStreetMap's tile servers; Leaflet with raster tiles from any host; Google or Mapbox | Every hosted option is a third-party request from the browser, which the CSP blocks and `PRODUCT.md` rules out. A PMTiles file is one static file Caddy serves with range requests, with no tile server to run |
| Sharing | The place travels with the transaction: a housemate who sees the row on a shared account sees its place and coordinates | Hiding coordinates from housemates | The row is already shared. Hiding one column would be a special case in `TransactionResponse`. The switch and this sentence make it explicit |
| Audit | `Place` is an audited field; the coordinates are not | Auditing both | The log shows readable values. A pair of numbers is noise there and a position history of a member |
| Place field control | A text input with a native `<datalist>` of suggestions | Extending `components/combobox-field`, which only selects | A datalist gives free text with suggestions, keyboard support and the phone's own picker with no new component |
| Other ways a row is written | Duplicate and Record refund copy Place but not the coordinates; templates keep Place; confirming a recurring entry and every bank import leave both empty | Copying the coordinates too | A duplicate is usually the same shop another day, while the coordinates record where one payment was made |
| Spelling | Suggestions and the report show the newest spelling of a place, grouping by the trimmed, lower-cased text, as the payee labels do | The most frequent spelling | The newest spelling is the one the member typed last, and it matches `ReportService`'s payee labels |
| Switch off | Reads answer null; an update keeps the stored values instead of clearing them; a create stores nothing | Clearing the columns on update | Turning the switch off must not destroy data a later switch-on would show again, the rule every switch follows |
| Imports | No import fills Place in this version | Reading OFX `PAYEE` address fields | The address in bank files is usually the registered office, not the shop. OFX addresses are a backlog item |

## Data model

| Change | Detail |
| --- | --- |
| `Transaction.Place` | `string?`, at most `TransactionPlace.MaxLength` = 120 characters (a new `Domain/Transactions/TransactionPlace.cs`, like `TransactionNote`), trimmed through `Common/OptionalText.cs`; empty is null |
| `Transaction.Latitude`, `Transaction.Longitude` | `decimal?` `numeric(7,5)` and `numeric(8,5)`, both or neither (check constraint); five decimals is about a metre |
| Index | Partial `(AccountId, Place) WHERE "Place" IS NOT NULL`. It serves the distinct-places query of the suggestions and the report, which group by place per visible account. The substring filter scans, as the description search does |
| `Feature.Locations` | Appended to `Feature`. The positional `FeatureFlags` record gains `Locations`, `FeatureFlags.Default` sets it off like `ApiTokens`, and `IsEnabled` maps it |
| Migration | `just migrate-add AddTransactionLocations` |

## Backend steps

1. **Fields.** The request, response, mapper and `TransactionInputValidator` carry `Place`, `Latitude` and `Longitude`:
   - latitude from −90 to 90 and longitude from −180 to 180, both or neither → a new `transaction.locationInvalid`,
   - length through the existing text codes,
   - with the switch off, read through `IInstanceSettingsStore.Current.IsEnabled(Feature.Locations)`, the response carries nulls, a create stores nothing and an update keeps the stored values.
2. **Places service.** `Endpoints/Transactions/Interfaces/IPlaceService.cs` and `Endpoints/Transactions/Services/PlaceService.cs`, used by `GET /api/transactions/places` in `Endpoints/Transactions/GetPlaces`:
   - **Request:** `GetPlacesRequest(string? Search, decimal? Lat, decimal? Lon)`. `Search` is at most 120 characters (`text.tooLong`). `Lat` and `Lon` are both or neither and in range (`transaction.locationInvalid`).
   - **Response:** `IReadOnlyList<PlaceSuggestionResponse>`, each `PlaceSuggestionResponse(string Name, int Count, decimal? Latitude, decimal? Longitude, bool Nearby)`. There are up to 20 distinct visible places matching `Search` by substring, ordered by use. Each carries the newest spelling, its count and the average of its coordinates.
   - **Nearby:** with `Lat` and `Lon`, the nearest place within 150 m comes first with `Nearby = true`. It is found by haversine in memory over the distinct places, which are a few hundred at most.
   - **Access:** the route is token-readable through `TransactionsGroup`, joins `TokenReadableTests.ReadableRoutes` and carries `RequiresFeature(Feature.Locations)`, as `DismissUnusualAmountEndpoint` does.
3. **Filter.** `TransactionFilterRequest.Place`, matched as a substring ignoring case, with its validator rule (`text.tooLong`) and its line in `TransactionFilterSummary`, following the payee filter's path. The text search in `TransactionService.Filtered` also covers the place. This feeds the list, the summary and the exports.
4. **Report.** `ReportSummaryResponse.ExpenseByPlace` is a list of `PlaceBreakdownItem(string? Place, decimal Amount, decimal? ComparisonAmount, int Count)` with `MaxItems = 50`, like `Reports/Shared/PayeeBreakdownItem.cs`. It groups by the trimmed, lower-cased place and shows the newest spelling; a null place is "No place". It is empty while the switch is off.
5. **Receipts.**
   - `ReceiptTextParser` gains `AddressOf`: the first header line after the merchant (`MerchantOf`, line 131) that has a street number and either an `LT-\d{5}` postcode or a known city. `ReceiptResult.Address` carries it, and the form fills Place as "Merchant, address".
   - `ReceiptService.LoadUploadAsync` reads the GPS tags before `AttachmentImage.WithoutMetadata`, applying the `Ref` signs. It passes them to `ReceiptReadingResponse` (the outer response, not `ReceiptResultResponse`) as `PhotoLatitude` and `PhotoLongitude`, never into the cached result.
   - A fresh upload that hits the reading cache still reads its own GPS tags. A PDF, or a reading of an attachment stored earlier, carries none.
   - The coordinates are returned only while both `ReceiptReading` and `Locations` are on.
   - Readings cached before this change have no address until they are read again with `force`.
6. **Headers.** `frontend/Caddyfile` and `frontend/Caddyfile.production` change `geolocation=()` to `geolocation=(self)`. `scripts/verify-production.mjs`, which today only checks that the header exists, gains a check of that value.
7. **Audit.** `nameof(Transaction.Place)` joins the allowlist in `AuditCollector`.
8. **Exports.**
   - The CSV gains a `Place` column after `Note`, empty while the switch is off. `TransactionCsvWriter.Header` is shared with the member export's `transactions.csv`, so the header expectations in `TransactionExportTests` and `TransactionTagEndpointTests` change.
   - Coordinates stay out of the CSV. They are in the member export's `data.json` and in the backup through the table.
9. **Error code.** `transaction.locationInvalid`, with English and Lithuanian text.

## Frontend steps

1. `just gen`. The places query joins the transaction invalidation rule in `src/api/invalidation.ts`, so a saved row refreshes the suggestions.
2. **Switch.**
   - `lib/settings.ts` `defaultSettings`, `groupOf` in `features/settings/settings-form/features-fields.tsx`, and the settings fixture in `storybook/fixtures/settings.ts` gain `locations`.
   - `groupOf` is a `satisfies Record<FeatureKey, …>`, so the build fails until the key is added.
   - `e2e/features.spec.ts` gains the switch if it lists them.
3. **Place field.** `features/transactions/place-field/place-field.tsx` has an input with a `<datalist>` filled from the places query. The search text is debounced through `hooks/use-debounced-draft.ts`.
   - **Use my location** is shown when `window.isSecureContext`. Its handler:
     1. calls `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy` and a 10-second timeout,
     2. writes the coordinates into the form,
     3. calls `queryClient.fetchQuery` for the places near them,
     4. fills the name when one comes back.
   - A denied permission or a timeout shows a sentence under the field.
   - With no earlier places the datalist is empty and the field is a plain text input. On a phone the browser shows the suggestions in its own picker.
   - "Location saved · Remove" shows while coordinates are set.
   - The field appears only while the switch is on.
4. **Receipt.** `FillFromReceipt` sets Place from the merchant and the address when the field is empty, and shows "Use the photo's location" when the response has photo coordinates.
5. **Ledger.** `place` joins the route's `transactionsSearchSchema`, `transaction-queries.ts`, the filters dialog, `use-filter-summaries.ts` and the active filter chips (with a case in the active-filters story). It also joins the saved filters and templates in `transaction-views.ts`, the draft, the optimistic row and the fixtures. `duplicateDraft` and `refundDraft` copy Place without the coordinates.
6. **Reports.** `features/reports/place-breakdown/` is modelled on `payee-breakdown`. `TransactionsLink`'s filter type and `BreakdownRow.filter` gain `place`, so its rows link to the ledger.
7. **Audit.** `features/households/household-activity/activity-sentences.ts` adds `place` to `FIELDS`, and the locales gain `audit.fields.place`.
8. **Text.** English and Lithuanian keys under `transactions.place`: `label`, `useMyLocation`, `locationSaved`, `remove`, `denied`, `timeout`, `usePhotoLocation`. Also `reports.expenseByPlace` with `noPlace`, `settings.features.locations`, and `serverErrors.transaction.locationInvalid`.
9. **Stories.**
   - The place field: suggestions, no suggestions, located with a nearby name, located with none, denied, timeout, insecure context. `navigator.geolocation` is stubbed in the story.
   - The place breakdown: default and empty.
   - The receipt fill with photo coordinates.
   - The features switch.

## Part 2: the map

Build it only when the gate below holds.

1. **Tiles.** A `maps` volume in `docker-compose.yml` and `docker-compose.production.yml`, mounted read-only into the Caddy container, with `handle /maps/*` and `file_server`. The administrator makes a Lithuania extract named `lithuania.pmtiles` with `pmtiles extract`, step by step in `docs/architecture/deployment.md`. The API cannot see Caddy's volume, so the reports page sends one `HEAD /maps/lithuania.pmtiles` and offers the Map view only when it answers 200.
2. **Chart.** `features/reports/place-map/place-map.tsx` lazy-loads `maplibre-gl` and `pmtiles`, bundles the style, glyphs and worker, and draws one circle layer from the places with coordinates. The map has `role="img"` with a label naming the top places, and the list stays the text equivalent.
3. **Check.** `verify-production.mjs` asserts that the CSP is unchanged. The browser's network log on the reports page shows only same-origin requests.
4. **Text, stories and tests.**
   - English and Lithuanian for the List and Map switch and the map's label.
   - Stories: the map with places, with no coordinates, and with the tile file missing (the switch hidden).
   - A unit test for turning places into map features. An e2e check in `just e2e` that the map loads from a fixture tile file.

## Tests

- **Integration:**
  - **Fields and the switch:**
    - Coordinates must come in pairs and within range.
    - The switch off hides the fields on read and ignores them on write.
  - **Suggestions:**
    - Suggestions come from visible rows only, and the active household narrows them.
    - The nearest-place answer returns a place at 100 m and not one at 200 m.
  - **Filter and report:**
    - The place filter and search narrow the list, the summary and the exports.
    - Expense by place matches the ledger summary filtered by place.
  - **Sharing and audit:**
    - A housemate sees the place on a shared account.
    - The audit log records the place and not the coordinates.
  - **Receipts:**
    - A reading of an uploaded photo with GPS returns photo coordinates.
    - The cached result stored for that photo has none.
- **Unit:**
  - `AddressOf` on every receipt fixture.
  - GPS reading with north, south, east and west references, on a new image fixture with EXIF.
  - The haversine distance.
- **Frontend:** the place field's story `play` for a granted and a denied position, and a unit test that `duplicateDraft` copies Place without coordinates.
- **More integration:**
  - An update with the switch off keeps the stored place.
  - The places endpoint refuses a lone latitude.
  - A fresh upload that hits the reading cache still returns its photo coordinates.

## Docs

- A new `docs/features/transaction-locations.md` and a row in `docs/features/README.md`.
- A new `docs/decisions/transaction-locations.md`, with a row in `docs/decisions/README.md`:
  - the rejected hosted geocoding and tile servers,
  - the photo-location rule and why it is kept out of the cache,
  - the browser location-service caveat.
- Updates:
  - `docs/architecture/deployment.md`: the `Permissions-Policy` change and, for part 2, the tile file.
  - Feature pages: `docs/features/receipt-reading.md`, `docs/features/reports.md`, `docs/features/transactions.md`, `docs/features/installation-settings.md` and `docs/features/exports.md`.
  - `docs/data-model.md`, `docs/api.md`, `docs/scope.md`, `docs/user-flows.md` (entering a place) and `docs/features/data-export-per-user.md` (older exports cannot be imported after the migration).
  - `docs/backlog.md`: a row for filling Place from OFX addresses.
  - `PRODUCT.md` §Capabilities: the geolocation header and the caveat.

## What must be true to ship

1. Part 1: with the switch off, responses and screens are identical to today's except for the `Permissions-Policy` header and the empty `Place` column in the CSV.
2. Part 2 gate: after two months of part 1 on the owner's ledger, at least a third of expenses carry coordinates. Otherwise the map would be mostly empty and the list already answers the question.
3. Part 2: `verify-production` passes, and the browser's network log shows only same-origin requests on the reports page.

## Open questions

None. OFX addresses are a backlog row (see the Imports decision).
