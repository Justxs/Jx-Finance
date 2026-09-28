# Interface

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/interface.md), [architecture: Visual system and motion](../architecture/visual-system.md), [architecture: Accessibility and keyboard shortcuts](../architecture/accessibility.md).

```mermaid
flowchart TD
    Pref[("preferencesCollection<br/>TanStack DB local storage, key jx-preferences, row browser")] --> Theme["theme: light, dark or system"]
    Pref --> Palette["palette: ledger, plum, sepia, graphite"]
    Pref --> Font["font and textSize"]
    Pref --> Side["sidebarCollapsed"]
    Pref --> Loc["locale: en or lt, absent means installation default"]
    Pref --> Hh["activeHouseholdId: absent means everything"]
    Pref --> Recent["commandRecents: the last 8 command palette entries, newest first"]
    Pref --> Prompt["monthClosePromptHidden: the yyyy-MM month whose dashboard close prompt was put off"]
    Init["public/theme-init.js, before the bundle"] --> Html["class dark and data-* attributes on html, no flash"]
    Theme --> Html
    Palette --> Html
    Font --> Html
    Tab["Change in another tab: storage event"] --> Pref
    Blocked["Storage blocked"] --> Mem["in-memory fallback, choices last for the session"]
    Views[("savedFiltersCollection, key jx-saved-filters<br/>transactionTemplatesCollection, key jx-transaction-templates")] --> Rows["one row per saved filter or template, not one row per browser"]
```

Two more collections sit beside the preferences row and follow the same rules: a zod schema per row, an explicit storage key, the same in-memory fallback, and the same cross-tab updates. They hold the saved ledger filters and the transaction templates described in [Transactions](transactions.md). Unlike `jx-preferences` they are lists, so each row carries its own id and name; nothing in them ever reaches the server.

## Navigation

```mermaid
flowchart TD
    Pages["navPages and, for administrators, adminNavPages<br/>in lib/navigation.ts"] --> Visible["visibleNav: drop pages whose feature switch is off"]
    Visible --> Entries["navEntries: one entry per page without a hub,<br/>one entry per hub for pages that share one"]
    Entries --> Side["Sidebar, Settings pinned to the bottom"]
    Entries --> Strip["Phone navigation strip"]
    Visible --> Tabs{"Current path is exactly a page of a tabbed hub<br/>with more than one visible page?"}
    Tabs -->|"yes"| Header["PageHeader: hub name as the h1, HubTabs under it"]
    Tabs -->|"no"| Plain["PageHeader: the page's own title"]
```

Every page in the main navigation is a row of `navPages` in `lib/navigation.ts`, with `/users` and `/settings` in `adminNavPages`. A row may name a `hub`, and `navHubs` gives each hub its label, icon and whether it shows tabs:

| Hub | Pages, in tab order | Tabs |
| --- | --- | --- |
| Categories | `/categories`, `/tags`, `/categorization-rules` (tab "Rules") | yes |
| Plan | `/budgets`, `/goals`, `/recurring-bills` | yes |
| Wealth | `/net-worth`, `/investments` | yes |
| Reports | `/reports` (tab "Overview"), `/close` (tab "Month close") | yes |
| Settings | `/profile`, `/households`, `/users` (administrators), `/settings` (administrators, labelled "Installation") | no |

`navEntries` in `components/app-sidebar` folds the visible pages into one entry per hub, in the order of the table. The entry links to the hub's first visible page and is marked current when the path is inside any of its pages (`isPathIn`, so `/net-worth/debts/…` keeps Wealth current). A tabbed hub with a single visible page, such as Wealth with investments switched off, shows that page's own name and icon instead of the hub's. For a user the sidebar reads Dashboard, Transactions, Accounts, Categories, Plan, Wealth and Reports, with Settings at the bottom (`mt-auto`); the phone navigation strip in `routes/__root.tsx` is built from the same entries. The user tile in the sidebar foot also links to `/profile`.

`useHubTabs` in `components/hub-tabs` looks up the current path. When it is exactly a page of a tabbed hub and the hub has more than one visible page, `PageHeader` shows the hub's name in the `h1` instead of the page title, draws `HubTabs` (links with the page icons, `aria-current="page"` on the current one, `preload="render"` so the sibling tabs' code and queries load as soon as the strip appears) under the title row and moves the page's description under the tabs. Sub-routes such as `/net-worth/debts/$debtId` are not pages of a hub and keep their own title. Settings is not tabbed: its pages share `SettingsLayout` and a grouped section nav, described in [Installation settings](installation-settings.md#one-settings-page).

Routes, URLs and shortcuts did not change with the hubs: `/budgets` is still `/budgets`, and `g b` still opens it. The shortcuts and the command palette read the page tables, not the entries, so the palette still lists every page, including `/profile`, whether or not the page has its own sidebar entry.

## Keyboard shortcuts

```mermaid
flowchart TD
    Key["keydown, matched by TanStack Hotkeys"] --> Guard{"Repeat, already handled, or on one of the<br/>signed-out screens: /login, /setup, /forgot-password,<br/>/reset-password, /verify-email?"}
    Guard -->|"yes"| Ignore["ignored"]
    Guard -->|"no"| Held{"Is a modifier part of the shortcut?"}
    Held -->|"no"| Bare{"In a textbox or combobox, or a dialog open?"}
    Bare -->|"yes"| Ignore
    Bare -->|"no"| Which
    Held -->|"yes"| Modal{"A dialog other than the help or the palette open?"}
    Modal -->|"yes"| Ignore
    Modal -->|"no"| Which{"Key"}
    Which -->|"n"| New["/transactions?new=true opens the add dialog"]
    Which -->|"/"| Search["click data-shortcut=search, else go to transactions"]
    Which -->|"?"| Help["toggle the help popover"]
    Which -->|"Mod+K"| Palette["open the command palette, or close it again"]
    Which -->|"g then a letter within 1.2 s"| Go["d dashboard, t transactions, a accounts, c categories, u rules,<br/>b budgets, o goals, l bills, w net worth, v investments, r reports,<br/>m month-end close, h households"]
```

The go-to letters come from `navPages` in `lib/navigation.ts`, the table the sidebar is drawn from, so a page behind a switched-off feature has neither a navigation entry nor a working letter. A letter opens its page, not its hub: `g o` opens Goals directly on the Goals tab of Plan. `g m` opens `/close`, the [Month-end close](month-end-close.md) page, which is the Month close tab of the Reports hub; `m` was free. `/profile`, `/users` and `/settings` have no letter.

Saved filters, templates and Duplicate got no shortcut, and they are not in the help list. The scheme knows four actions — go to a route, focus the search box, toggle the help, open the palette — and every one of them is global. Duplicate needs a row the keyboard has no way to point at, because the ledger has no row cursor, and a saved filter or a template is a popover on one page rather than a destination with a URL. A shortcut for either would have to invent a fifth action kind and a page-local registry for two menus.

Every signed-out screen is now excluded, not only `/login` and `/setup`: the password reset and address confirmation pages were pressing keys that would have bounced the reader off the page they arrived at from an email, and the palette in particular must not leave itself open behind a sign-in it never saw.

`Mod+K` is the one shortcut with a modifier: `Ctrl+K` on Windows and Linux, `⌘K` on macOS, written once as `Mod+K` and resolved per platform by TanStack Hotkeys. It is also the only one that still fires while a field has focus, which is what a palette needs and what a bare letter cannot have: every bare key in this scheme is deliberately swallowed by an input. It still steps aside for an ordinary dialog, so the palette never opens on top of a half-filled form, and the palette's own dialog is excluded from that rule so the same keys close it. The help list prints it through `formatForDisplay`, so a Mac reads `⌘K` where Windows reads `Ctrl+K` while every bare key is printed as it is written.

## Command palette

```mermaid
flowchart TD
    Shortcut["Mod+K, or the same keys again"] --> Store["commandPaletteStore, open or closed"]
    Store -->|"open"| Mount["The dialog mounts and asks for its lists"]
    Mount --> Acc["GET /api/accounts"]
    Mount --> Cat["GET /api/categories"]
    Mount --> Tag["GET /api/tags"]
    Mount --> Hh["GET /api/households, only while the households switch is on"]
    Mount --> Known["me and settings, already in the cache from the root loader"]
    Acc --> Entries["Entries"]
    Cat --> Entries
    Tag --> Entries
    Hh --> Entries
    Static["One table of pages and one list of actions, in command-entries.ts"] --> Entries
    Known --> Gate{"Administrator only? Behind a feature switch?"}
    Gate --> Entries
    Entries --> Rank["Fold case and accents, score the label then the keywords,<br/>recently used first, at most 50 rows"]
    Rank --> Listbox["Listbox under the combobox"]
```

One shortcut opens a search box over the whole application. It offers three kinds of entry: a page, a record and an action.

Pages come from one table in `frontend/src/features/command-palette/command-entries.ts` rather than from the route tree, because a route is a path while an entry is a name a person types and a place with a title: the table carries both, and it also carries the sections that have no route of their own — the trash, the signed-in browsers, two-factor sign-in, notifications, the import and the appearance on `/profile`, the tax summary view of the investments page, and the feature, email, Discord and backup sections of the installation settings. Every row names the feature switch or the administrator role it needs, checked against the same `settings.features` and `me.role` the sidebar and the route guards use, so nothing in the list can lead to a 404 or to the redirect a guard would answer with.

Records are the accounts, the categories and the tags the caller can see; choosing one opens the ledger filtered to it, which is the ledger's own `accountId`, `categoryId` and `tagIds` parameters and not a new screen. There is no server-side search: the three lists are the complete, already-paged-free lists the ledger page loads anyway, they are filtered in the browser, and an installation would have to reach thousands of accounts before that stopped being instant. Transactions are deliberately not searchable from here — that is a paged, filtered query the ledger already answers far better than a fifty-row list could.

Actions are the ones that exist today and that the caller may run: a new transaction, a new transfer, a new account, "Close last month" while the `MonthClose` switch is on, a backup for an administrator, signing out, switching the theme, switching the language, and switching the active household. "Close last month" navigates to `/close` without a month, which opens the latest ended month that is still open in its year, or last month when every one is closed. The three create actions travel through the URL — `/transactions?new=true`, `/accounts?new=transfer` and `/accounts?new=account` — so the back button undoes them and the palette needs no handle on a dialog it does not own; the accounts page gained that `new` parameter for this, the way the transactions page already had one. The household entries are listed only while the switch is on and the caller has a membership, and the scope the caller is already in is left out rather than listed as a choice that would do nothing.

```mermaid
flowchart TD
    Choose["Enter on the active row, or a click"] --> Remember["commandRecents in jx-preferences:<br/>newest first, no repeats, at most 8"]
    Remember --> Close["The palette closes"]
    Close --> Kind{"What was chosen"}
    Kind -->|"a page or a record"| Nav["Navigate to its route and search parameters"]
    Kind -->|"a create action"| Url["The same navigation with new=true, new=transfer or new=account"]
    Kind -->|"theme or language"| Pref["savePreferences, the same call the toggles make"]
    Kind -->|"active household"| Scope["setActiveHousehold, then every query is invalidated"]
    Kind -->|"back up now"| Backup["POST /api/backups, with a toast"]
    Kind -->|"sign out"| Out["POST /api/auth/logout, clear the cache, go to /login"]
```

Matching folds case and accents away — `NFD` with the combining marks removed — so `kavines` finds "Kavinės ir restoranai" and `KAVINĖS` finds it as well. A query is scored against the label first: an exact name, then a prefix, then the start of a word, then anything contained, then a subsequence, which is the fuzzy part that lets `rue` find "Recurring entries". A few entries carry keywords as well — a section carries its parent's name, an account carries its IBAN — and a keyword match is always ranked behind every label match rather than mixed in with them. Ties are broken by what was used recently, so with the box still empty the last eight choices stand at the top in the order they were made, and with something typed a recent entry only wins against an equally good match. There is no debounce and nothing is deferred: the filter is a single pass over a few hundred strings already in memory, with no request behind it, so a timer would only add latency to every keystroke.

Nothing is loaded for the palette while a page is merely open. The dialog is mounted only while it is open, and mounting is what asks for the accounts, the categories, the tags and, when the households switch is on, the households. Every one of those is a list some page already loads, so on most screens the cache answers all four without a request; they are held for five minutes, so opening the palette a second time asks for nothing. `me` and the settings are already warmed by the root loader. A list that fails is quiet: it contributes no entries, and the pages and actions are there either way.

The dialog is a Base UI dialog with an `sr-only` title and description; the box inside it is a combobox with `aria-expanded`, `aria-controls` and `aria-activedescendant`, and focus never leaves it — the arrow keys, `Home` and `End` move the active descendant through the listbox, `Enter` runs it, `Escape` closes, and `Mod+K` closes it too. A query nothing answers removes the listbox rather than leaving an empty one: `aria-expanded` becomes false, `aria-controls` is dropped, and a sentence takes its place. A visually hidden `role="status"` announces how many rows are showing. The stories cover opening, filtering, choosing with the keyboard, the empty state, the role and feature gating and the ordering of recents, and each of them is scanned by axe.

Below the `md` breakpoint the sidebar becomes a compact header with a scrolling navigation strip of the same hub entries, tables become lists (`TransactionsList`) and filters move into a dialog; both layouts share one data source and the switch is CSS only.

`activeHouseholdId` is the only preference the server reads: the API client puts it on every request as `X-Active-Household`, and `HouseholdSwitcher` invalidates every query after a change so the whole application reloads under the new scope. It sits under the brand in the sidebar and beside the brand in the phone header, shows the current scope, and renders nothing for a user with no household. See [Households and sharing](households-and-sharing.md).
