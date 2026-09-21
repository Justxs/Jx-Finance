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
    fontSize: "1.0625rem"
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
  section: "40px"
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

Jx Finance looks like a well-kept account book, not a SaaS dashboard. The page is paper. Content sits directly on it, separated by whitespace first and rules second: a section opens with its title and 48px of space, hairlines separate rows inside a list, and a double rule sits under a total. Rules are spent only where they help the eye track a row or mark a total. Boxes are reserved for things that really are separate objects: overlays, the sign-in form, a recovery-code sheet.

The product is used in sit-down bookkeeping sessions on a desktop, so the interface favors scanning and density over first-impression spectacle. Numbers are the content: they are tabular, right-aligned, signed, and the easiest thing on the screen to read.

**Key Characteristics:**
- Content-first, not container-first. Sections are ruled, not carded.
- One serif voice for page titles and headline figures; one sans for everything else.
- Color is semantic. Green is money in, red is money out or destructive, navy is action and selection. Nothing is colored for decoration.
- Squared, quiet components: 6px controls, 2px tags, 4px meters with no rounding.
- Both themes are first-class; every token has a dark value.

## Brand

**The mark** is the ledger bird: a small bird in silhouette carrying a receipt in its beak. It is one solid shape with three cutouts (the eye, the wing and the receipt), so whatever is behind it shows through. It stands directly on the page with no tile, box or outline around it, the same way content does.

**The lockup** is the bird followed by "Jx Finance" in the display serif at weight 600. Use `Brand` (`components/brand`) everywhere: `compact` renders the bird alone (collapsed sidebar), sizes `sm` (mobile header), `md` (sidebar) and `lg`, and `stacked` puts a larger bird above the name, centered, for sign-in and setup. An installation name from settings replaces "Jx Finance" beside the bird. `BrandMark` is filled with `primary`, so it follows the theme and the chosen palette: navy in light, pale blue in dark. It is sized by height (`h-*`); the width follows the 375:271 shape.

**Files** in `frontend/public`: `favicon.svg` (bird alone, switches between navy and pale blue with the browser color scheme), `favicon.ico` (16, 32, 48), `brand/apple-touch-icon.png` (180, square, the OS rounds it), `brand/icon-192.png`, `brand/icon-512.png`, `brand/icon-maskable-512.png` (bird at 56% inside the safe zone), `brand/mark.svg`, `brand/mark-maskable.svg`, and `site.webmanifest`. Icons that need a solid background (ICO, PNG, maskable) put a paper bird on a Ledger Navy tile; that tile is the only filled tile in the brand and never appears inside the product. Browser chrome takes the sidebar color through `theme-color`.

**Rules.** Keep clear space of one quarter of the bird height on every side. Minimum height 16px; below 24px the receipt lines close up and the silhouette carries the mark. One color only, `primary` on a neutral surface or paper on navy: never income green, expense red, gradients, shadows or outlines. The bird always faces right, toward the name. Do not redraw, rotate or crop it, do not take the receipt away, and do not place it inside another box.

## Colors

Cool, slightly blue-tinted neutrals with a navy ink accent. Tokens live in `frontend/src/global.css`; dark values are defined under `.dark`. Ledger Navy is the default palette; Plum, Sepia and Graphite are per-browser alternatives under `[data-palette]` that re-tint the neutrals and the primary at the same lightness. Income green, expense red and the destructive fill are identical in every palette.

### Primary
- **Ledger Navy** (`navy`): primary buttons, links, focus ring, selection, meters that measure neutral progress, the user monogram.

### Secondary
- **Income Green** (`income` for text, `positive-fill` for bars and meters): signed income amounts, reached goals, positive change.
- **Expense Red** (`expense` for text, `destructive` for fills and destructive buttons): expense totals, over-budget states, debts, destructive actions.

### Neutral
- **Paper** (`paper`): the page. Most content sits directly on it.
- **Surface** (`surface`): overlays, popovers, dialogs, auth forms. Never used to box ordinary page content.
- **Sidebar** (`sidebar`): the second neutral layer for navigation chrome.
- **Ink** (`ink`): text and the section rule.
- **Muted Ink** (`muted-ink`): metadata, labels, inactive navigation. 4.5:1 or better on paper and sidebar.
- **Hairline** (`hairline`): row dividers and control borders.

### Named Rules
**The Semantic Color Rule.** A color means the same thing everywhere. Category lists, charts and meters never use a rainbow to tell rows apart; position, label and amount do that.

**The Signed Money Rule.** Direction is never color alone. Signed amounts carry "+" or "−" as well as the income color; plain expenses stay ink.

## Typography

**Display Font:** Source Serif 4 Variable (Georgia fallback), self-hosted.
**Body Font:** Source Sans 3 Variable (Segoe UI, system-ui fallback), self-hosted.

**Character:** A bookkeeping pair. The serif gives titles and totals the weight of a printed statement; the sans keeps dense rows, labels and controls calm and legible. Both cover Lithuanian diacritics. This pair is the default; a reader may switch their own browser to sans only, serif only, system fonts, Inter, Atkinson Hyperlegible, IBM Plex or Newsreader with Inter, and to a smaller or larger text size. Always use `font-sans` and `font-serif`, never a family name, so those choices apply.

### Hierarchy
- **Page title** (serif 600, 1.75rem/2.25rem): one per page, rendered by `PageHeader`. Tailwind `text-page-title`, which carries the size, line height and tightened tracking.
- **Lead figure** (serif 600, 2.5rem, lining tabular): the single most important number on a summary (`SummaryStats`, `DashboardStats`); a net total carries a double rule (`border-b-3 border-double border-rule`). Tailwind `text-stat`, or `text-stat-lg` (2.75rem) for a card that shows one figure alone; both carry the 1.1 line height and tightened tracking.
- **Section title** (sans 600, 1.0625rem): class `section-title`, sits under a section rule.
- **Body** (sans 400, 0.9375rem): rows, forms, table cells. Tailwind `text-sm`.
- **Label / metadata** (sans 400–500, 0.8125rem): table headers, tags, secondary lines. Tailwind `text-xs`.
- **Counter** (sans 600, 0.625rem): the unread count on a bell badge and nothing else. Tailwind `text-2xs`.

### Named Rules
**The Serif Budget Rule.** Serif appears in page titles, the wordmark and lead figures only. Buttons, labels, table cells and section titles are always sans.

**The Tabular Rule.** Every amount, date column and count uses `tabular-nums`, and amounts are right-aligned in a column of fixed or shared width.

## Layout

A fixed navigation sidebar (232px, collapsible to 64px) on the left; the page column is capped at 72rem with 48px side padding on large screens. There is no top bar on desktop: notifications, language, theme and collapse live in the sidebar foot. Below 768px the sidebar is replaced by a compact header and a horizontally scrolling navigation strip.

Vertical rhythm: 40px between page sections (`space-y-10`), 16px between a section title and its content, 10px row padding. Two-column page bodies use a 5fr/7fr split with a 48px gutter so the narrower column holds lists and the wider one holds charts or tables.

Navigation items are grouped by job with extra space between groups, not labels: keep the books (dashboard, transactions, accounts, categories), plan (budgets, goals, bills), review (net worth, reports), manage (households, users).

## Elevation & Depth

Flat. Depth is tonal: paper, sidebar, surface. Only floating layers cast a shadow (`shadow-lg` on popovers, dialogs and the notification panel). Nothing on the page itself is lifted.

## Shapes

Controls and overlays use 6px corners. Tags use 2px. Meters and chart bars are square or 2px. No pills, no circular icon tiles. Borders are 1px; the only heavier stroke is the 3px double rule under a lead total.

## Components

### Sections
`Section` (`src/components/ui/section`) is a tonal panel: 6px corners, `muted` at 50% in light and `card` in dark, 20 to 24px padding, no border and no shadow. `Panel` is the same surface for blocks without a section title (summary stats, a standalone table or list). Panels never nest: a panel inside a panel or a dialog drops its fill and padding. Pages stack panels 20px apart and use the full width beside the sidebar. `SectionTitle` (an `h2`, sans 600, 1.125rem) opens a section. Lists inside use `Rows` (hairline dividers between rows, none above the first or below the last). On the dashboard, `DashboardSection` adds the title row with an optional "go to page" link. Do not wrap page content in `Card`.

### Summary stats
`SummaryStats` renders one lead figure in the display serif, with no rule under it, and the remaining figures as a plain definition list with no rules. Mark the lead with `lead: true`.

### Tables
No surrounding box and no header fill. Header cells are `text-xs` medium muted with an ink bottom rule; body rows are hairline-separated. Cells use `px-3` and the table is pulled out by `-mx-3` so text aligns with the page edge while hover fills have breathing room. Dates and amounts never wrap. Wide tables use `table-fixed` with explicit widths for every column except the description, which takes the remaining space; category and account names truncate to one line with the full text in `title`, so row actions are never pushed out of view.

### Tags
`Tag` (`components/ui/tag`) replaces every ad hoc pill. Tones: `neutral` (outline), `accent` (tinted fill), `positive`, `negative`. Use sparingly; plain text is preferred when the column header already names the attribute.

### Meters
`Meter` (`components/ui/meter`) is a 4px square bar. `primary` for budgets, `positive` for goals and reached targets, `negative` for over-budget.

### Buttons and inputs
36px controls (44px on touch devices). One primary button per view, and form actions sit in a right-aligned footer after the last field, Cancel before the primary. Row actions are ghost icon buttons. Every icon-only button shows a tooltip: `Button` uses its `aria-label` as the tooltip when no `tooltip` is given, so an icon button only needs the label. Inputs are filled with `muted` at 40% and turn to paper on focus.

### Charts
Charts are built from `components/chart`. Income and expense over time is one component, `IncomeExpenseChart`, used by the dashboard and reports: paired 14px bars (income green, expense red), the net as a thin ink line with open dots, an ink zero line, horizontal hairline grid only, compact euro ticks at 12px. The legend is plain HTML above the plot, squares for bars and a dash for lines. Hover shows a dashed hairline at the bucket, never a filled band, and `ChartTooltip`: a popover surface with the period as a muted label, one row per series with its swatch, signed tabular amounts, and the net under an ink rule. Spending pace (dashboard) is two stepped cumulative lines, this month in navy and last month dashed in muted ink. Budgets and account balances on the dashboard are `Meter` lists, not charts. Shares of a whole (balance by account, investment allocation) use `ShareBars` (`components/share-bars`): name, percent of the positive total, amount, and a navy `Meter`, red for a negative amount. The budgets page compares limit and spent as paired horizontal bars, limit in `input` gray and spent in navy, red once over the limit. Recurring bills show the fixed amounts due in each of the next six months as single navy bars. Net worth composition is three lines: accounts navy, assets green, debts red. Net worth is a single navy line on an automatic domain so the change is visible, with the same cursor and tooltip. Charts do not animate, do not take keyboard focus and never show a focus outline; each is wrapped as a labelled image. Series labels come from translations, never from data keys.

### Ledger tools
A list that can be filtered shows a totals line above it: count, then signed income and expense for the current filter, in tabular figures with muted labels. When rows are selected, a selection toolbar takes the place of that line ("N selected", one bulk control, an outline apply button, "Clear selection"); it never adds a second primary button. The import review pins a summary bar with the selected count, duplicates, transfers and the net of the selection under a double rule. A value the product filled in for the user carries a neutral "Suggested" tag until they edit it.

Below the `md` breakpoint a wide table becomes a ledger list: description and signed amount on the first line, date, category and account in muted small text on the second, row actions at the end. The amount is always visible without scrolling. Filters and sort move into a single "Filters" dialog.

Keyboard keys are shown as `kbd` with a 2px radius, hairline border and monospace at the label size.

### Money in several currencies
Every amount is formatted in its own currency with `useMoney().format(value, currency)`; omitting the currency means the reporting currency. A foreign amount in a table carries its reporting-currency value on a second line, `text-xs`, muted, prefixed with `≈`. An account that holds more than one currency lists each balance under its total the same way. A movement between currencies reads `sold → bought` on one line with tabular figures. An amount input that needs a currency pairs the input (`flex-1`) with a compact `CurrencySelect` in a `w-24` wrapper showing only the code; standalone currency fields use the full `CODE · Name` label. Rates show four decimals as `1 EUR = 1.0842 USD` between two rules, never in a card.

### Overlays and errors
Dialog scrims are flat (`bg-black/30`, no blur). Dialogs use the 6px control radius and a footer separated by a hairline, with no fill. A delete confirmation names the item. Inline load errors (`ErrorState`) show an expense-red alert icon, the named failure in medium ink, one muted line saying the ledger is unchanged, and an outline "Try again" button; icon-sized slots use an icon fallback instead of a sentence. A failed page (`RouteError`) keeps the page title and offers "Try again" (primary) and "Reload the page" (outline); when the whole app fails it centers the same message under a faded bird.

A section keeps its rule and title while its content loads or fails: the `QueryBoundary` sits inside the `section`, below the `h2`. Pass `errorSubject` (normally the section title) so the message names what failed ("Recent transactions could not be loaded."). When a whole page fails, the root boundary renders `RouteError` with the page title still in place.

The first paint is the splash: the bird centered inside a thin hairline ring with a navy arc circling it, served from `index.html` and `public/splash.css` and repeated by `Splash` as the root pending component, so no partial layout flashes before the session check finishes. `RoutePending` mirrors a page (title, stats, rows). Loading placeholders follow the ledger: `RowsSkeleton` for lists and tables (hairline-ruled rows of short bars), `StatsSkeleton` for `SummaryStats`. A plain `Skeleton` block is only for a chart plot. A zero amount is neutral ink with no sign, and a chart with nothing to plot is replaced by one muted sentence.

A failed form submission stays on screen: `FormError` (`components/form-error`) renders a `role="alert"` block in `text-expense` under a 1px expense rule, above the form footer, listing each server reason when there are several. The mutation is marked `meta: { silent: true }` so it does not also toast. Error toasts stay for 12 seconds.

Every row the user entered can be corrected: a ghost pencil before the delete button opens the same form that created the row, titled with the row's name and saved with "Save". A row the product will not let them change (a broker import) shows no pencil and carries a tag whose tooltip and screen-reader text say where to correct it.

Below `md`, accounts, users and the import review follow the same ledger list as transactions. In the import review the upload form collapses to one line (file, account, "Change") once a preview exists, "Record as" appears only on rows that look like transfers and is otherwise a "Mark as transfer" text button, and the review pages at 50 rows. A report trend of more than 14 days is shown in weeks, labelled with the date range.

### Navigation
Sidebar links are muted text; the current page gets a paper fill, a hairline border and semibold ink. No colored stripe.

## Do's and Don'ts

### Do:
- **Do** start every page section with `Section` and a `SectionTitle`.
- **Do** right-align amounts and keep them on one line.
- **Do** use `text-expense` for validation and error text as well; `destructive` is a fill color and fails text contrast in the dark theme.
- **Do** use `text-income` / `text-expense` for money text and `Tag`/`Meter` for status and progress.
- **Do** keep row actions as ghost icon buttons with `aria-label` and `title`.

### Don't:
- **Don't** give panels a border or shadow, and never nest them.
- **Don't** add circular or rounded-square icon tiles in rows.
- **Don't** use `rounded-full` on tags or meters.
- **Don't** color rows, bars or categories for variety.
- **Don't** use serif outside titles and lead figures.

### Export and import
Exports sit behind one ghost "Export" button (`ExportMenu`); its popover lists the formats, each with a one-line hint. Bank statement import has no page or navigation entry: an "Import data" section on Settings and Profile opens `ImportDialog`, which first lists the supported providers and then runs upload and review in a wide dialog.
