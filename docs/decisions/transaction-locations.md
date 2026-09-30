# Transaction locations: decisions

Related: feature page [Transaction locations](../features/transaction-locations.md); architecture [Containers](../architecture/deployment.md#the-map-tile-file).

## Current

**Places.** A place is a free text of at most 120 characters on the transaction, with optional latitude and longitude that come as a pair, behind the `Locations` switch, which starts off. There is no places table: suggestions are the distinct earlier places the caller can see, grouped by trimmed, lower-cased text under the newest spelling, and a position is named after the nearest of them within 150 metres. Nothing is geocoded by an outside service. The browser asks for the position only when Use my location is pressed, and the `Permissions-Policy` allows geolocation for the site itself only. With the switch off, reads answer null and writes keep what is stored.

**Photo location.** The GPS position of a freshly uploaded receipt photo is read just before its metadata is stripped, returned with that one reading and offered, never set, and never stored in the cached reading.

**The map.** The map is MapLibre GL over a PMTiles extract of Lithuania that the administrator puts in a volume Caddy serves from the page's own origin, with the style, the fonts and the worker bundled, so the Content-Security-Policy is unchanged and no request leaves the origin. The plan's gate for it was waived by the owner on 2026-10-01.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-10-01.** The map was built together with the places, although the plan gated it on two months of places with coordinates on at least a third of expenses
  - Rejected: Waiting for the gate
  - Why: The owner asked for both parts at once and waived the gate. The risk the gate guarded against, a map that is mostly empty, is handled on screen: the list stays the default view and the map says when no place in the range has coordinates
- **2026-10-01.** The map is MapLibre GL with a PMTiles extract of Lithuania in a `maps` volume, served by Caddy with `file_server` from the same origin; MapLibre's worker is the bundled same-origin file set with `setWorkerUrl`, the style is written in code with the Protomaps basemap layers, and the labels are drawn from the bundled Source Sans 3 files through the style's `font-faces`
  - Rejected: OpenStreetMap's tile servers; Leaflet with raster tiles from any host; Google or Mapbox; a tile server container; a glyph server or glyph PBF files generated for the installation
  - Why: Every hosted option is a third-party request from the browser, which the Content-Security-Policy blocks and `PRODUCT.md` rules out. A PMTiles file is one static file that Caddy serves with range requests, so there is no tile server to run or update. MapLibre 6 draws glyphs itself from font files named in `font-faces`, which the page already bundles, so glyph ranges would be a build step for nothing. The worker is a module worker from the page's origin, which `script-src 'self'` allows without `blob:`
- **2026-10-01.** The reports page offers the map only after `HEAD /maps/lithuania.pmtiles` answers 2xx with a type that is not HTML
  - Rejected: An API field saying whether the file exists; always offering the map
  - Why: The API runs in another container and cannot see Caddy's volume, and a setting would drift from the file. Always offering it would show an empty map on most installations. Checking the type keeps the Vite development server, which answers every unknown path with the page, from pretending the file is there
- **2026-10-01.** The GPS tags of a freshly uploaded receipt photo are read with Magick.NET in `ReceiptService.LoadUploadAsync` before `AttachmentImage.WithoutMetadata`, returned only in the reading response as `photoLatitude` and `photoLongitude`, and offered with "Use the photo's location"
  - Rejected: Storing them in the cached `ReceiptReadings.Result`; setting them on the transaction without asking; ignoring them
  - Why: The cached result travels in backups and the member export, so storing the position there would undo the metadata stripping for a person who never chose to keep it. A photo taken later at home carries the home's position, so it is offered, not set. A fresh upload answered from the cache still reads its own tags, because the cache is keyed by the cleaned bytes, which have none
- **2026-10-01.** A position is named after the nearest visible earlier place within 150 metres, computed on the server from the rows the caller can see and narrowed by the active household
  - Rejected: Reverse geocoding through Nominatim or any hosted service; only the caller's own rows
  - Why: A hosted lookup sends the position out of the house. The household's own history knows the shops it goes to, which is what the name is for, and a shared account's shop is as much the partner's. One caveat stays outside the application: the browser or operating system may ask its own network location service to find the position, which the documentation says next to the button
- **2026-10-01.** A place is `Place` text with optional `Latitude` and `Longitude` on the transaction, both or neither, filtered by substring; suggestions and the report group by the trimmed, lower-cased text and show the newest spelling; `Place` is audited and the coordinates are not; Duplicate and Record refund copy the place but not the coordinates
  - Rejected: A `Places` table that transactions point at; the most frequent spelling; auditing the coordinates; copying the coordinates
  - Why: A table needs merge and rename screens and a sharing rule, while suggestions from distinct earlier values give the recall without one, and a substring filter still meets "Maxima, Ozo g. 18" and "Maxima Ozo". The newest spelling is the one the member typed last and matches how payee labels are chosen. A pair of numbers is noise in the activity log and would be a position history of a member. A duplicate is usually the same shop another day, while coordinates record where one payment was made
- **2026-10-01.** With `Locations` off, reads answer null, a create stores nothing and an update keeps the stored values; the header is `Permissions-Policy: geolocation=(self)` in both Caddyfiles and the position is asked for only in the button's click handler
  - Rejected: Clearing the columns on an update while off; leaving geolocation switched off in the header; asking when the form opens
  - Why: Turning a switch off must not destroy data a later switch-on would show again, the rule every switch follows. The header is what lets the browser ask at all, and it still asks the person; asking only on the click ties the prompt to an intent and needs no effect
