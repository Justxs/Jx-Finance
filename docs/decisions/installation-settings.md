# Installation settings and feature switches: decisions

Related: feature page [Installation settings and feature switches](../features/installation-settings.md); architecture [Installation settings](../architecture/installation-settings.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-10-03.** Demo data is loaded from the guided setup and removed by Start for real, which empties every ledger table while a `DemoData` flag is set and the administrator is the only user; the Start step embeds the existing account form, backup restore and member import
  - Rejected: Deleting the administrator's rows table by table through the ownership map of the member export; allowing the removal only while the guided setup is pending; marking each demo row; a separate demo user to sign in as; copies of the account form, the restore and the import inside the guided setup
  - Why: With one user, emptying the ledger tables is the same as deleting that user's rows and covers tables added later with no new code, while the member export's map leaves households out by design. Exploring usually goes past the tour, so the flag, which only the demo load raises, decides instead of the setup being pending. A mark on every row would be a column in a dozen tables for one moment of an installation's life, and a demo user would leave sample data behind in a real ledger. The embedded pieces keep their own validation, errors and tests

- **2026-10-03.** First-run setup signs the administrator in with a 1-day session and opens a guided setup that saves each step through `PUT /api/settings`; a `SetupPending` flag, default false, keeps administrators in it until `POST /api/setup/finish`; the tutorial is a dashboard card whose steps are worked out from data
  - Rejected: One anonymous `POST /api/setup` carrying every choice; a `SetupCompletedAt` timestamp filled in on existing installations; the 30-day remembered session after setup; a coach-mark overlay over the real pages; storing which checklist steps are done; storing the chosen preset
  - Why: Saving per step after sign-in reuses the endpoints, validation and errors the Settings page already has, keeps the anonymous surface to the one form, and lets a closed tab come back to the guided setup. A backfill misses an installation whose settings row was never written, while a flag that only first-run setup raises needs none. The browser that ran setup did not ask to be remembered. An overlay breaks whenever a page's layout changes and is hard to make accessible. A stored step drifts from the data, as after deleting the only budget, and a preset only writes feature switches, which nothing would read back

- **2026-10-03.** A settings save whose row changed underneath it, through a concurrency token, answers 409 `conflict.stale` and saves nothing; `PUT /api/settings/market-prices` now reports that failure instead of ignoring it
  - Rejected: Reloading the row and applying the change again; dropping the concurrency token on `TelegramChatId`
  - Why: The main settings save revalues stored rates when the reporting currency changes, so running its change twice would revalue twice. Without the token, an outbox pass that started before an administrator changed the group would write a removed-bot mark or a delivery time against the new group. The conflict is rare, since it needs a save during the pass that follows a supergroup move, so an explicit answer is enough

- **2026-10-03.** Four always-on features gained switches, `Attachments`, `PayeeNames`, `People` and `CashFlowForecast`, all on by default and on for an upgraded installation; each hides its routes, its screens and its fields on read, and keeps its data
  - Rejected: Switches for tags, transaction groups and reconciliation; starting the new switches off; clearing names, files or people's rows when a switch goes off
  - Why: Each of the four is a screen with routes of its own, which is what a switch can hide without a second shape for rows: names, counts and markers read as null or 0, as the `Locations` and `UnusualAmounts` fields already do. Tags, groups and reconciliation keep the reasons logged on their own pages. Turning a switch on must bring everything back, so the default keeps what an installation already used

- **2026-09-22.** A feature switch is declared on the endpoint group as `RequiresFeature` metadata, and the feature gate, the active-household check and the 500 handler write the same FastEndpoints problem an endpoint writes, with the code only in `errors[].code`
  - Rejected: Keeping the prefix table in `FeatureGateMiddleware`; a FastEndpoints global pre-processor; writing middleware errors through `IProblemDetailsService` with a top-level `code`
  - Why: The prefix table had to be kept in step with `ApiRoutes` by hand, while the group already names the feature's endpoints; `FeatureGateTests` now pins the old prefix-to-feature table against the mapped endpoints. A pre-processor runs after binding, so a malformed body would answer 400 before the 404 of a switched-off feature. `IProblemDetailsService` writes the MVC shape, which is a second envelope beside the one every endpoint uses; the client already reads codes from `errors[]` everywhere, so dropping the top-level `code` removes a special case instead of adding one
