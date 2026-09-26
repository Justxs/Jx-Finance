---
name: Jx Finance
description: A private household ledger. Ruled paper, exact figures, no boxes.
colors:
  paper: "#fbfbfc"
  ink: "#1c2329"
  surface: "#ffffff"
  sidebar: "#f1f3f5"
  navy: "#253e52"
  muted: "#eef1f3"
  muted-ink: "#5d6872"
  accent: "#e6ebef"
  hairline: "#dfe4e8"
  rule: "#1c2329"
  input-stroke: "#808c97"
  income: "#1f6a4b"
  expense: "#ad3932"
  positive-fill: "#267051"
  destructive: "#b8403a"
typography:
  page-title:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.012em"
  figure-lead:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontFeature: "lnum, tnum"
  section-title:
    fontFamily: "Source Sans 3 Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "Source Sans 3 Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  label:
    fontFamily: "Source Sans 3 Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.125rem"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
spacing:
  row: "10px"
  group: "16px"
  section: "20px"
  gutter: "48px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    height: "36px"
  input:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "36px"
  tag:
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.sm}"
    height: "20px"
---

# Design System: Jx Finance

## Overview

**Creative North Star: "The Household Ledger"**

Jx Finance looks like a well-kept account book, not a SaaS dashboard. The page is paper. Each section is a quiet tonal panel on it: a slightly darker fill with no border and no shadow, opened by its title. Inside, hairlines separate rows in a list, and a double rule sits under a net total. Rules are spent only where they help the eye track a row or mark a total. Bordered boxes are reserved for things that really are separate objects: overlays, the sign-in form, a recovery-code sheet.

The product is used in sit-down bookkeeping sessions on a desktop, so the interface favors scanning and density over first-impression spectacle. Numbers are the content: they are tabular, right-aligned, signed, and the easiest thing on the screen to read.

**Key Characteristics:**
- Content-first, not container-first. Sections are tonal panels, not bordered cards.
- One serif voice for page titles and headline figures; one sans for everything else.
- Color is semantic. Green is money in, red is money out or destructive, navy is action and selection. Nothing is colored for decoration.
- Squared, quiet components: 6px controls, 2px tags, 6px-tall meters with no rounding.
- Both themes are first-class; every token has a dark value.

## Brand

**The mark** is the ledger bird: a small bird in silhouette carrying a receipt in its beak. It is one solid shape with three cutouts (the eye, the wing and the receipt), so whatever is behind it shows through. It stands directly on the page with no tile, box or outline around it, the same way content does.

**The lockup** is the bird followed by "Jx Finance" in the display serif at weight 600. Use `Brand` (`components/brand`) everywhere: `compact` renders the bird alone (collapsed sidebar), sizes `sm` (mobile header), `md` (sidebar, the default) and `lg`, and `stacked` puts a larger bird above the name, centered; `lg` is only used stacked, on the sign-in, setup and password pages. An installation name from settings replaces "Jx Finance" beside the bird. `BrandMark` is filled with `primary`, so it follows the theme and the chosen palette: navy in light, pale blue in dark. It is sized by height (`h-*`); the width follows the 375:271 shape.

**Files** in `frontend/public`: `favicon.svg` (bird alone, switches between navy and pale blue with the browser color scheme), `favicon.ico` (16, 32, 48), `brand/apple-touch-icon.png` (180, square, the OS rounds it), `brand/icon-192.png`, `brand/icon-512.png`, `brand/icon-maskable-512.png` (bird at 56% inside the safe zone), `brand/mark.svg`, `brand/mark-maskable.svg`, and `site.webmanifest`. Icons that need a solid background (ICO, PNG, maskable) put a paper bird on a Ledger Navy tile; that tile is the only filled tile in the brand and never appears inside the product. Browser chrome takes the sidebar color through `theme-color`: `index.html` starts with the Ledger values by OS color scheme, and the theme store rewrites them from the live `--sidebar` whenever the theme or palette changes.

**Rules.** Keep clear space of one quarter of the bird height on every side. Minimum height 16px; below 24px the receipt lines close up and the silhouette carries the mark. One color only, `primary` on a neutral surface or paper on navy: never income green, expense red, gradients, shadows or outlines. The bird always faces right, toward the name. Do not redraw, rotate or crop it, do not take the receipt away, and do not place it inside another box.

## Colors

Cool, slightly blue-tinted neutrals with a navy ink accent. Tokens live in `frontend/src/global.css`; dark values are defined under `.dark`. Ledger Navy is the default palette; Plum, Sepia and Graphite are per-browser alternatives under `[data-palette]` that re-tint the neutrals and the primary at the same lightness. Income green, expense red and the destructive fill are identical in every palette.

The names below are the frontmatter names; the CSS variable each one maps to is given in brackets.

### Primary
- **Ledger Navy** (`navy`, `--primary`; charts `--chart-1`): primary buttons, links, checked checkboxes, focus ring (`--ring`), selection, meters that measure neutral progress, the user monogram.

### Secondary
- **Income Green** (`income`, `--income`, for text; `positive-fill`, `--secondary` / `--chart-2`, for bars and meters): signed income amounts, reached goals, positive change.
- **Expense Red** (`expense`, `--expense`, for text; `destructive`, `--destructive` / `--chart-3`, for fills and destructive buttons): expense totals, over-budget states, debts, destructive actions.

### Neutral
- **Paper** (`paper`, `--background`): the page.
- **Surface** (`surface`, `--card` / `--popover`): overlays, popovers, dialogs, auth forms, and the section panel fill in dark. Never used to box ordinary page content in light.
- **Sidebar** (`sidebar`, `--sidebar`): the second neutral layer for navigation chrome and the mobile header.
- **Muted** (`muted`, `--muted`): section panels (50% in light), input fills (40%), row hover, skeletons.
- **Accent** (`accent`, `--accent`): the accent tag, the focused select item, file-drop hover.
- **Ink** (`ink`, `--foreground`): text. The ink rule (`rule`, `--rule`) is the same color in light and marks the tab baseline, rate and fieldset rules, the net rule in chart tooltips, the chart zero line and the double rule under a net total.
- **Muted Ink** (`muted-ink`, `--muted-foreground`): metadata, labels, table headers, inactive navigation and tabs. 4.5:1 or better on paper, sidebar, surface and muted in every palette.
- **Hairline** (`hairline`, `--border`): row and table dividers, the table header rule, tag and card outlines, the meter track, dialog footers, chart grid lines.
- **Input stroke** (`input-stroke`, `--input`): the borders of inputs, selects and checkboxes, and budget limit bars.

### Named Rules
**The Semantic Color Rule.** A color means the same thing everywhere. Category lists, charts and meters never use a rainbow to tell rows apart; position, label and amount do that.

**The Signed Money Rule.** Direction is never color alone. Signed amounts carry "+" or "−" as well as the income color; plain expenses stay ink.

## Typography

**Display Font:** Source Serif 4 Variable (Georgia fallback), self-hosted.
**Body Font:** Source Sans 3 Variable (Segoe UI, system-ui fallback), self-hosted.

**Character:** A bookkeeping pair. The serif gives titles and totals the weight of a printed statement; the sans keeps dense rows, labels and controls calm and legible. Both cover Lithuanian diacritics. This pair is the default; a reader may switch their own browser to sans only, serif only, system fonts, Inter, Atkinson Hyperlegible, IBM Plex or Newsreader with Inter, and to a smaller or larger text size. Always use `font-sans` and `font-serif`, never a family name, so those choices apply.

### Hierarchy
- **Page title** (serif 600, 1.75rem/2.25rem): one per page, rendered by `PageHeader`. Tailwind `text-page-title`, which carries the size, line height and tightened tracking.
- **Lead figure** (serif 600, 2.5rem, lining tabular): the single most important number on a summary (`SummaryStats`). Tailwind `text-stat`, or `text-stat-lg` (2.75rem) where a card shows one figure alone (`DashboardStats`); both carry the 1.1 line height and tightened tracking. The other figures of a summary are sans 600 `text-xl`.
- **Section title** (sans 600, 1.125rem/1.5rem): `SectionTitle`, an `h2` with `text-lg leading-6 font-semibold` at the top of a section panel.
- **Dialog title** (sans 500, 1.0625rem): `DialogTitle` and `AlertDialogTitle`, Tailwind `text-base font-medium`.
- **Body** (sans 400, 0.9375rem): rows, forms, table cells. Tailwind `text-sm`.
- **Label / metadata** (sans 400–500, 0.8125rem): table headers, tags, secondary lines. Tailwind `text-xs`.
- **Counter** (sans 600, 0.625rem): the unread count on a bell badge and nothing else. Tailwind `text-2xs`.

### Named Rules
**The Serif Budget Rule.** Serif appears in page titles, the wordmark and lead figures only. Buttons, labels, table cells and section titles are always sans.

**The Tabular Rule.** Every amount, date column and count uses `tabular-nums`, and amounts are right-aligned in a column of fixed or shared width.

## Layout

A fixed navigation sidebar (232px, `w-58`, collapsible to 64px) on the left. The page column takes the full remaining width, with no maximum. Its side padding is 16px, then 32px from `sm`, 40px from `lg` and 56px from `2xl`; its vertical padding is 24px, 32px from `sm` and 40px from `lg`. There is no top bar on desktop: notifications, language, theme and collapse live in the sidebar foot. Below 768px the sidebar is replaced by a compact 56px header and a horizontally scrolling navigation strip, both on `sidebar`.

Vertical rhythm: 20px between page sections (`space-y-5`), 8px below a section's title row before its content (`SectionHeader`, `mb-2`), 16px between form fields (`FormGrid`, `gap-4`), 10px row padding. Two-column page bodies use `SplitColumns`, a 5fr/7fr split with a 48px gutter (`gap-x-12`) from `lg`, so the narrower column holds lists and the wider one holds charts or tables. Settings-style pages (`SectionLayout`) put a 13rem section nav beside the content.

Navigation items are grouped by job with 16px of extra space between groups, not labels: keep the books (dashboard, transactions, accounts, categories, tags, rules), plan (budgets, goals, recurring entries), review (net worth, investments, reports), manage (households, users, settings). Features switched off for the installation drop out of the list.

## Elevation & Depth

Flat. Depth is tonal: paper, sidebar, surface. Only floating layers cast a shadow: `shadow-md` on popovers (including the notification panel and the export menu), select menus and tooltips; `shadow-lg` on toasts and chart tooltips. Popovers, select menus and dialogs also carry a 1px ring of ink at 10%; dialogs have that ring and no shadow. Nothing on the page itself is lifted.

## Shapes

Controls, panels and overlays use 6px corners (`rounded-lg`); checkboxes, tooltips, select items and `Card` use 4px (`rounded-md`); tags and `kbd` use 2px (`rounded-sm`). Meters are square; chart bars have a 1px top radius. No pills, no circular icon tiles; the one circle is the splash ring. Borders are 1px; the only heavier strokes are the 2px active-tab underline and the 3px double rule under a net total.

## Components

### Sections
`Section` (`src/components/ui/section`) is a tonal panel: 6px corners, `muted` at 50% in light and `card` in dark, 20 to 24px padding, no border and no shadow. `Panel` is the same surface for blocks without a section title (summary stats, a standalone table or list). Panels never nest: a panel inside a panel or a dialog drops its fill and padding. Pages stack panels 20px apart and use the full width beside the sidebar. `SectionTitle` (an `h2`, sans 600, 1.125rem) opens a section. Lists inside use `Rows` (hairline dividers between rows, none above the first or below the last). On the dashboard, `DashboardSection` adds the title row with an optional "go to page" link. Do not wrap page content in `Card`.

### Summary stats
`SummaryStats` is one `Panel` laid out as `SplitColumns`: one lead figure in the display serif, with no rule under it, and the remaining figures as a plain definition list with no rules, in sans 600 `text-xl`. Mark the lead with `lead: true`; without one, the first item leads. Any figure can carry a `note` under it.

### Tables
No surrounding box and no header fill. Header cells are 36px tall, `text-xs` medium muted, with a hairline bottom rule; body rows are hairline-separated, with a `muted` 50% fill on hover. Cells use `px-3` and the table is pulled out by `-mx-3` so text aligns with the page edge while hover fills have breathing room. Dates and amounts never wrap. Wide tables use `table-fixed` with explicit widths for every column except the description, which takes the remaining space; category and account names truncate to one line with the full text in `title`, so row actions are never pushed out of view.

### Tags
`Tag` (`components/ui/tag`) replaces every ad hoc pill. Tones: `neutral` (outline), `accent` (tinted fill), `positive`, `negative`. Use sparingly; plain text is preferred when the column header already names the attribute.

### Meters
`Meter` (`components/ui/meter`) is a 6px (`h-1.5`) square bar on a hairline-colored track; the fill grows over 300ms. `primary` for budgets, `positive` for goals and reached targets, `negative` for over-budget. Pass `label` to expose it as `role="meter"`.

### Buttons and inputs
Controls are 36px by default (`h-9`). `sm` and `icon-sm` are 32px, `lg` is 40px, and every size grows to 44px on touch devices. `sm` is the size for toolbar and inline actions: Export, Filters, the retry button in `ErrorState`. One primary button per view, and form actions sit in a right-aligned footer after the last field, Cancel before the primary. Row actions are ghost icon buttons. Every icon-only button shows a tooltip: an `icon` or `icon-sm` `Button` uses its `aria-label` as the tooltip when no `tooltip` is given, so it only needs the label; a text button gets a tooltip only through `tooltip`. Inputs, selects and checkboxes have an `input-stroke` border. In light, inputs are filled with `muted` at 40% and turn to paper on focus; in dark they are filled with `input` at 30%.

### Charts
Charts are built from `components/chart` and use only `--chart-1` (navy), `--chart-2` (green), `--chart-3` (red), ink and muted ink. All of them share these rules:
- Horizontal hairline grid only; no axis lines or tick marks.
- Compact ticks at 12px in muted, tabular figures, in the reporting currency.
- The legend is plain HTML above the plot: 8px squares for bars, a 12px dash for lines, and a dashed dash for comparison series.

Income and expense over time is one component, `IncomeExpenseChart`, used by the dashboard and reports:
- Paired bars, income green and expense red, at most 14px wide, 2px apart, with a 1px top radius.
- The net is a 1.5px ink line. It has open dots when there are 16 points or fewer, and a filled dot on hover.
- An ink (`rule`) zero line.
- When reports compare against an earlier period, two 1.5px dashed lines (4 3) in green and red show "Earlier income" and "Earlier expense". The dashboard never shows them.

Line and income/expense charts share one hover style: a 1px dashed (3 3) muted-ink line at the bucket, and `ChartTooltip`.
- The tooltip is a popover surface with a hairline border, 4px corners and `shadow-lg`.
- The period is a muted label. Below it is one row per series that has a value, with its swatch and tabular amounts.
- Amounts are signed only where the series is signed (income and expense), and the net sits under an ink rule.

Vertical bar charts (budgets, recurring bills) show a filled band of `muted` at 50% on hover instead.

The individual charts:
- **Spending pace (dashboard):** two stepped cumulative lines by day of month. This month is a 2px navy line that stops today; last month is a dashed 1.5px muted-ink line.
- **Dashboard budgets and account balances:** `Meter` lists, not charts.
- **Shares of a whole** (balance by account on the dashboard and the Accounts page, investment allocation): `ShareBars` (`components/share-bars`). Each row shows the name, its percent of the positive total (blank for zero or negative rows) and the amount, over a navy `Meter`, red for a negative amount. Meter length is scaled to the largest absolute amount.
- **Budgets page:** limit and spent as paired horizontal bars at most 10px thick, largest limit first. The limit is in `input` gray; spent is navy, red once over the limit.
- **Recurring bills:** the fixed amounts of active expense bills due in each of the next six months, as single 22px navy bars with no legend. Overdue occurrences count toward the current month.
- **Net worth composition:** three lines, accounts navy, assets green, debts red.
- **Net worth history:** a single navy line on an automatic domain so the change is visible. Both net worth charts show one muted sentence until there are two snapshots.
- **Investment value:** market value navy, cost basis muted ink.
- **Debt balance:** navy, with extra payments in green.
- **Debt payment split:** stacked yearly bars, principal navy, interest red, extra green.

Charts do not animate, do not take keyboard focus and never show a focus outline; each is wrapped as a labelled image (`role="img"`). Series labels come from translations, never from data keys.

### Ledger tools
A list that can be filtered shows a totals line above it: the count, then signed income (`+`, green) and expense (`−`, ink), both semibold, in tabular figures with muted labels.

On desktop, when rows are selected, a selection toolbar takes the place of that line:
- "N selected".
- A category select with an outline "Set category" button.
- An outline "Set tags" button that opens a popover with the tag picker and a small primary "Set tags" button.
- A ghost "Clear selection".
- A hint appears when the selection mixes transaction types.
- The toolbar itself never holds a primary button.

The mobile list has no selection.

The import review has a summary bar, sticky from `md`, that shows:
- "X of Y selected", duplicates and transfers.
- The net of the selection per currency, each green or red by sign and set on a double rule (`border-b-3 border-double border-rule`).
- A "Set category for selected" select with an outline "Apply to N rows" button.

Rows in the review carry tags for what the product found or filled in:
- A neutral "Suggested category" tag, with a tooltip, until the user changes the category.
- An accent "Filled by a rule" tag.
- An accent "Looks like a transfer" tag.
- A neutral "Duplicate" tag.

Below the `md` breakpoint a wide table becomes a ledger list:
- The first line holds the description and the signed amount, plus an attachment count. A `≈` line can sit under a foreign amount.
- Tag chips follow the first line.
- The second line holds the date, category and account in muted small text. The category is left out when it already stands in for a missing description.
- Row actions sit at the end.
- The amount is always visible without scrolling.
- Filters and sort move into one dialog, opened by an outline "Filters" button with the active count and titled "Filter and sort".

Keyboard keys are shown as `kbd`: 20px tall, 2px radius, hairline border, `muted` 40% fill, monospace at the label size.

### Money in several currencies
Every amount is formatted in its own currency with `useMoney().format(value, currency)`; omitting the currency means the reporting currency. A foreign amount in a table carries its reporting-currency value on a second line, `text-xs`, muted, prefixed with `≈`. An account that holds more than one currency lists each balance under its total as a `text-xs` muted line, without `≈` because these are real balances, not conversions. A movement between currencies (a conversion or a cross-currency transfer) reads `sold → bought` on one line with tabular figures. An amount input that needs a currency pairs the input (`flex-1`) with a compact `CurrencySelect`, which wraps itself in `w-24` and shows only the code. It renders nothing when the household has only one usable currency. Standalone currency fields use the full `CODE · Name` label. Rates show four decimals as `1 EUR = 1.0842 USD`. In forms the rate sits between two ink rules, never in a card; in the conversions list it sits inline in the muted metadata line.

### Overlays and errors
Dialog scrims are flat (`bg-black/30`, no blur). Dialogs are a popover surface with the 6px control radius, a 1px ring of ink at 10% and no shadow; alert-dialog footers are separated by a hairline, with no fill. A delete confirmation names the item.

`ErrorState` handles inline load errors. It shows:
- An expense-red alert icon.
- The named failure in medium ink.
- One muted line saying the ledger is unchanged.
- A small outline "Try again" button, when a retry is possible.

Icon-sized slots pass an icon fallback to `QueryBoundary` instead (the notification bell), and chrome slots that can fail quietly render nothing.

`RouteError` handles a failed page. It offers "Try again" (primary, which also reloads the route's data) and "Reload the page" (outline). It keeps the page title when the route is one of the main navigation pages; other routes get the untitled message. When the whole app fails it shows "Jx Finance could not be loaded." in a left-aligned column, centered on the page under the bird at 30% opacity.

A section keeps its title while its content loads or fails: the `QueryBoundary` sits inside the `section`, below the `h2`. Pass `errorSubject` (normally the section title) so the message names what failed ("Recent transactions could not be loaded.").

The first paint is the splash: the bird centered inside a 2px hairline-colored ring, with a navy arc spinning around it; the arc stops under reduced motion. It is inline markup in `index.html`, styled by Tailwind classes, and repeated by `Splash` as the root pending component, so no partial layout flashes before the session check finishes. `RoutePending` mirrors a page (title, stats, rows).

Loading placeholders follow the ledger: `RowsSkeleton` for lists and tables (hairline-ruled rows of short bars), `StatsSkeleton` for `SummaryStats`. A plain `Skeleton` block is for a chart plot or a single figure or control that is still loading (the totals line, the import dialog). A zero amount is neutral ink with no sign, and a chart with nothing to plot is replaced by one muted sentence.

A failed form submission stays on screen. `FormError` (`components/form-error`) renders a `role="alert"` block in `text-expense` under a 1px expense rule, above the form footer: a medium title line, then each server reason when there are several or when some were already shown on their fields. It renders nothing when every error landed on a field. The mutation is marked `meta: { silent: true }` so it does not also toast. Error toasts stay for 12 seconds; a failed query only toasts when data is already on screen.

Every row the user entered can be corrected: a ghost pencil before the delete button opens the same form that created the row, titled with the row's name and saved with "Save". A row the product will not let them change (a broker import) shows no pencil and carries a tag whose tooltip and screen-reader text say where to correct it.

Below `md`, accounts and users follow the same ledger list as transactions. The import review has its own mobile list: the name with the date under it, the amount on the right, then flags, category, tags and transfer controls stacked.

In the import review:
- Once a preview exists, the upload form collapses to one line (file, account, "Change") at every width.
- "Record as" appears on rows that look like transfers, or once a transfer is set; otherwise the row shows a muted "Mark as transfer" link button.
- The review pages at 50 rows.

A daily report trend longer than 14 days is shown in 7-day chunks from the start of the range, labelled with each chunk's date range.

### Navigation
Sidebar links are muted text with a 16px icon; the current page gets a paper fill, a hairline border and semibold ink. No colored stripe. The user's initials sit in a 32px navy tile with 4px corners in the sidebar foot.

## Do's and Don'ts

### Do:
- **Do** start every page section with `Section` and a `SectionTitle`.
- **Do** right-align amounts and keep them on one line.
- **Do** use `text-expense` for validation and error text as well; `destructive` is a fill color and fails text contrast in the dark theme.
- **Do** use `text-income` / `text-expense` for money text and `Tag`/`Meter` for status and progress.
- **Do** keep row actions as ghost icon buttons with an `aria-label`, which becomes their tooltip.

### Don't:
- **Don't** give panels a border or shadow, and never nest them.
- **Don't** add circular or rounded-square icon tiles in rows.
- **Don't** use `rounded-full` on tags or meters.
- **Don't** color rows, bars or categories for variety.
- **Don't** use serif outside titles and lead figures.

### Export and import
Exports sit behind one small ghost "Export" button (`ExportMenu`) on Transactions and Reports. Its popover is headed "Choose a format" and lists CSV and PDF, each with a one-line hint. Bank statement import has no page or navigation entry. An "Import data" section on Settings and Profile, shown only when the import feature is on, has an outline "Import bank statement" button. It opens `ImportDialog`, which first lists the supported providers (Swedbank today) and then widens to run upload and review.
