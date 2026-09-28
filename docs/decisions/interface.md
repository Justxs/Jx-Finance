# Interface and command palette: decisions

Related: feature page [Interface](../features/interface.md); architecture [Visual system and motion](../architecture/visual-system.md), [Accessibility and keyboard shortcuts](../architecture/accessibility.md).

## Current

### Design

Neutral surfaces, compact controls, readable typography, semantic colors, mobile navigation; no external fonts. Two-way choices are segmented controls and category pickers are searchable comboboxes. Active ledger filters show as removable chips above the rows. Statement import opens from the ledger header and account rows as well as Settings

### Navigation

At most eight sidebar entries: Dashboard, Transactions and Accounts on their own, the hubs Categories (Categories, Tags, Rules), Plan (Budgets, Goals, Recurring entries), Wealth (Net worth, Investments) and Reports (Overview, Month close), and Settings at the bottom. A hub's pages keep their own routes and shortcuts and appear as tabs under the hub's title. Settings is one page for everyone over `/profile`, `/households`, `/users` and `/settings`, with a section nav grouped into Personal, Shared and Installation (administrators)

### Command palette

One dialog on `Mod+K` over every page: the pages and sections from a table beside the entries, the accounts, categories and tags from the lists the client already holds, and the actions that exist today, each row gated by the caller's role and the installation's feature switches. Matching is case- and accent-insensitive and fuzzy, ordered by how close the match is and then by what was used recently; the last eight choices live in `jx-preferences`. It loads its four lists when it first opens, never on page load, and adds no endpoint

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-28.** The sidebar foot keeps only the notification bell and the collapse control; language, theme, keyboard shortcuts and sign-out move into an account menu on the user tile, and theme and language are also choices under Settings, Appearance
  - Rejected: Keeping five icon buttons in a row; only dropping the keyboard icon; moving the settings to the menu alone
  - Why: The row held six controls for things set once or rarely, beside a bell that needs to stay in sight for its badge. A menu alone hides the settings from anyone who does not think to open their name, so the tile carries an up-down chevron, each row names the setting with its current value, and the same choices sit in Appearance where people look for them. The shortcuts help became a dialog because it no longer has a button to anchor a popover
- **2026-09-28.** A ledger row's category can be changed in its cell with a borderless combobox that posts the single row to `POST /api/transactions/bulk-category`
  - Rejected: Only the edit dialog; `PUT /api/transactions/{id}` with the whole row; a new single-row endpoint; a plain select in the cell
  - Why: Filing a run of uncategorized rows through a dialog each is the slowest part of tidying a month, and bulk selection needs the rows picked first. A full PUT from a cell would send back every field the cell never showed and overwrite an edit made meanwhile, while the bulk endpoint already writes only the category with the type check and the split refusal. A new endpoint would repeat that rule. The combobox follows the standing rule that category pickers are searchable
- **2026-09-28.** Form actions inside a dialog stick to the bottom of its scrolling body
  - Rejected: A footer slot on `Modal`; leaving the actions at the end of the fields
  - Why: A split transaction with many lines, or a form with a long description, pushed Save below the fold. A footer slot would move the buttons out of the form element, so every form would need its submit wired by id; sticky positioning keeps the markup and the Enter-to-submit behaviour unchanged
- **2026-09-28.** The pager states the row range and total, and adds a page number field from five pages on
  - Rejected: Numbered page buttons; a select listing every page; the field on every pager
  - Why: Numbered buttons wrap on phones and still need ellipses on long lists, and a select of hundreds of pages is unusable. Below five pages, Previous and Next reach any page in a click or two, so a field would only add noise

- **2026-09-28.** Expense / Income and the recurring bill's shape are a segmented radio group; every category picker is a combobox with its search box inside the popup; other short lists stay plain selects
  - Rejected: Plain selects everywhere; making `SelectField` searchable above an option count; a combobox that types into the trigger itself
  - Why: A two- or three-way choice is faster and clearer when every option is visible and one click away. Category lists grow with the household and are the one long list people pick from many times per session, so they need typing. A threshold would change a control's keyboard behaviour when a list grows past it. A search box inside the popup keeps the closed control looking and sizing like every other select, which matters in the import table's narrow cells. Forms choose the control with `kind` on `SelectFieldControl`, so no field component was added.
- **2026-09-28.** The ledger lists its active filters above the rows as removable chips, each column filter's button names its value, and the header's Clear filters button moved into that line
  - Rejected: Only tinting the filter icon; writing the values into the column headers; chips that replace the column filters
  - Why: A tint says that something is filtered but not what, so the totals and rows could not be read without opening every popover, and a screen reader heard no difference at all. Values in the headers would widen the columns. The column filters stay where people already edit them, and the chips only read and remove. One Clear filters control belongs next to the filters it clears; unlike the old header button, it keeps the sort, which is not a filter.
- **2026-09-28.** Importing a statement starts from the ledger header and from an account's row actions, as well as from Settings
  - Rejected: Keeping the only entry under Settings; moving the import to its own page; removing the Settings section
  - Why: Importing is the monthly ledger task, and a settings page is the last place people look for it. The dialog already existed, so the new entries only open it, and the account entry passes the account the dialog already accepted. The Settings section stays because the month-end checklist and the command palette link there.
- **2026-09-28.** A row with three or more actions shows one vertical-ellipsis menu button listing them all; rows with one or two keep their inline icon buttons
  - Rejected: Always inline icon buttons; always a menu; keeping edit inline and folding only the rest; a Popover with a button list
  - Why: Transaction and account rows had grown to three or four look-alike icons that crowded the amount column and were hard to tell apart without hovering. A menu names each action in words and takes one slot. Rows with only edit and delete stay one click away, since a menu would add a click to the most common tasks for no space saved. Folding only some actions would split one row's actions across two places. The Base UI menu gives menu roles, arrow-key movement and typeahead that a popover of buttons would have to rebuild. Reorder arrows on rules stay inline because they are pressed repeatedly in a row.

- **2026-09-27.** Related pages share one sidebar entry, a hub, and show as tabs under the hub's title; the routes, URLs and `g` shortcuts stay as they were
  - Rejected: Nested routes such as `/plan/budgets`; one long page per hub; keeping the seventeen sidebar links; moving Categories, Tags and Rules into Settings
  - Why: The sidebar had grown to seventeen links, most of them visited a few times a month, and the ones used every session were lost among them. Nested routes would have broken every saved link, bookmark and shortcut and changed every route file for no gain the reader could see, since the tabs already say where a page belongs. One long page per hub would load and scroll through three features to reach one, and would lose each page's own URL and search params. Categories, tags and rules are used in every bookkeeping session, so they are ledger work, not configuration, and keep their own entry
- **2026-09-27.** One Settings page for everyone, grouped into Personal, Shared and Installation, over the existing `/profile`, `/households`, `/users` and `/settings` routes
  - Rejected: Keeping Profile and the administrators' Settings as two pages with their own navigation, and Households and Users as pages of their own; merging the four into one route
  - Why: A person looking for "settings" had to know whether a choice was theirs, their household's or the installation's before knowing where to look, and Import data and Appearance were shown in both Profile and Settings. One layout with labelled groups answers that on the page itself, and each group shows only to those who can use it. Keeping the four routes keeps their guards, loaders, links and palette entries as they were
- **2026-09-27.** The Accounts page shows each account's share as a column of the accounts table and a Total row under it, instead of a separate "Balance by account" panel
  - Rejected: Keeping the second list of the same balances under the table; a stacked composition bar across all accounts
  - Why: The panel repeated every balance the table had just shown, one screen lower. A stacked bar needs a colour per account, which the Semantic Color Rule forbids because colour here means income, expense or the one accent; a navy meter per row shows the same share without that. The dashboard card keeps its share bars, because there it is the only list of balances
- **2026-09-26.** Stale content dims to 55% after a 150 ms delay, with `aria-busy` and a progress cursor; this replaces the ink rule of 2026-09-20
  - Rejected: Keeping the ink rule; a small "Updating…" label beside the section's first line; no visible cue
  - Why: The owner found a line appearing above the table on every sort and filter distracting. The dimmed rows are superseded content that is about to be replaced, and the owner accepted that their muted text drops below 4.5:1 for that moment. The delay keeps fast answers from flickering
- **2026-09-26.** Column filter popovers hold a draft and apply it with an Apply button (or Enter); Clear sits beside it as an outline button
  - Rejected: Applying on every change, with the text filter debounced for 300 ms
  - Why: Every committed change is a navigation and a request, so typing or picking a date range fired several of them and redrew the table under the open popover. The phone filters dialog keeps applying as it goes
- **2026-09-21.** The command palette opens on `Mod+K` — `Ctrl+K` on Windows and Linux, `⌘K` on macOS — and it is the only shortcut in the scheme that carries a modifier and the only one that still fires while a field has focus
  - Rejected: A bare letter such as `k` or `p`, to match the rest of the scheme; reusing `/`; a `g`-style sequence
  - Why: Every bare key in this scheme is deliberately ignored inside an input, a textarea or a combobox, and a palette whose whole point is to be reachable from anywhere — including the middle of a transaction form — cannot be. `/` is taken and means something narrower and more useful: focus the search box of the page you are on. A sequence would make the one entry point to the whole application the slowest shortcut in the product. `Mod+K` is also what a person already reaching for a palette presses. The cost is the browser's own `Ctrl+K`, which is prevented while the application has focus, and one extra rule in the guard: a shortcut with a modifier skips the "you are typing" test but still yields to an ordinary open dialog, so the palette never lands on top of a half-filled form
- **2026-09-21.** The palette's pages come from a table written next to the entries, not from the generated route tree
  - Rejected: Walking `routeTree` and deriving a title per route; a `staticData` title on every route
  - Why: A route is a path; an entry is a name someone types, a title in two languages, a feature switch and a role. Half of what the palette offers is not a route at all — the trash, the signed-in browsers, the import and appearance sections, the tax summary view and the feature, email and backup sections of settings are search parameters on four routes — so a walk of the route tree would have needed a second table beside it for exactly those. Putting the gate in the same row as the destination is also what makes "never show an entry that leads to a 404 or a 403" checkable: one pure function takes `features` and `role` and answers the list, and one unit test reads it
- **2026-09-21.** Accounts, categories and tags are filtered in the browser from the lists the client already loads; transactions are not searchable from the palette and no endpoint was added
  - Rejected: A `GET /api/search` across the ledger; a per-kind search endpoint; prefetching the three lists when the application starts
  - Why: The three lists are small, unpaged and already fetched by the ledger, the categories screen and the tags screen, so the palette usually costs nothing at all: it asks for them when it first opens and holds them for five minutes. A search endpoint would be a new contract, a new permission surface and a round trip per keystroke for data already in memory. Transactions are the one thing that genuinely needs the server, and the ledger already answers that far better than fifty rows in a dialog could — so the palette sends you to the ledger filtered by an account, a category or a tag instead of pretending to be it. Prefetching on load was rejected outright: it would put three requests on every page load for a dialog most visits never open
- **2026-09-21.** Recently used entries are kept in the existing `jx-preferences` row as `commandRecents`, capped at eight, and the ranking uses them only to break ties
  - Rejected: A collection of its own like the saved filters; a usage count per entry; recents above everything even when something matches better
  - Why: Recents are one short list per browser, exactly like the theme or the sidebar state, so they belong in the row that already holds those rather than in a third local-storage collection with its own schema and id per row. A count would keep rewarding something used often months ago; eight entries, newest first, is what a person actually reaches for. Letting recency outrank the score would mean typing the exact name of a page and watching something else sit above it, which is the one thing a palette may never do
- **2026-09-20.** Shared surfaces are React components and `cva` variants built from Tailwind utilities (`Card`, `Panel`, `Section`, `SectionTitle`, `Rows`, `FormGrid`, `SplitColumns`, `StaleRegion`); `global.css` has no `@layer components`
  - Rejected: Semantic classes written with `@apply` (`.section`, `.rows`, `.form-grid`, `.is-stale`, ...)
  - Why: The project rule is utilities only. The classes hid their styles from the class sorter and `tailwind-merge`, could not be typed or found by reference, and flattened nested surfaces through selectors nobody saw at the call site. Parity was checked with before and after screenshots of every story
- **2026-09-20.** Stale content keeps full contrast and shows an ink rule on its top edge with `aria-busy`
  - Rejected: Dimming to 70% opacity; a tinted background
  - Why: Dimmed muted text cannot reach 4.5:1, which forced seven `color-contrast` exemptions; a tint would have to be checked against every palette in both themes, a rule depends on none of them
- **2026-09-19.** Per-browser preferences (theme, palette, typeface, text size, sidebar, language) are one row in a TanStack DB local-storage collection with a zod schema and the explicit key `jx-preferences`; old single-value keys are migrated once
  - Rejected: Raw `localStorage` calls wrapped in a hand-written try/catch helper
  - Why: One schema-checked place for what the browser remembers, cross-tab updates from the library instead of our own `storage` listener, and the same TanStack family as the rest of the client. The cost is a stored JSON format that `theme-init.js` must understand and an in-memory `storage` passed explicitly, because the library's default reads `window.localStorage` unguarded
