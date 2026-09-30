# Plan: Sankey diagram of the report period

Status: planned 2026-09-30, reviewed against the code the same day. Size S. Frontend only: no endpoint, no migration and no feature switch, because every number it draws is already in `GET /api/reports/summary`. Build after nothing; [Hide amounts](../features/interface.md#hide-amounts) shipped on 2026-09-30, so the labels go through the masked formatter like every other amount.

## Outcome

- The reports page gains a **Money flow** section under the breakdown lists.
  - On the left: the income categories.
  - In the middle: one **Money in** node.
  - On the right: the expense categories and, when the period ended with money left, a **Saved** node.
- Two extra left-hand nodes keep both sides of the hub equal, so the chart never invents money:
  - **From savings** joins when the period spent more than it earned.
  - **Money back** joins when refunds in some categories outweighed their spending. It is named per category in its tooltip and in one line under the chart: "Money back: Electronics €40.00 (more refunded than spent)".
- **Saved** always equals the period's net, the same figure as the Net stat and the Saved column of the year review, even when Money back is present.
- Each side shows exactly the rows of the breakdown list above it: categories rolled up to their parent group by `rollUpToGroups`, the five with the largest weight, and the rest folded into **Other**. Both use one shared function, so with a comparison on the chart keeps the lists' comparison-aware choice of rows, while every node's amount is the chosen period's.
- Investment income, investment taxes and fees, and Uncategorized appear as nodes but are not links, exactly like their list rows.
- Clicking a category or group node opens the ledger with the same search `TransactionsLink` builds for that list row: `categoryId`, `type`, `dateFrom` and `dateTo`. A group's id includes its children, as the ledger's category filter already does. Principle 3: the figure leads to its rows.
- On a phone the section is hidden and the lists stay the view, because a horizontal flow of long Lithuanian names does not fit 360 px.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Library | `Sankey` from Recharts 3.10.1, already the only chart dependency; its `onClick(item, type)` gives the node | `d3-sankey` plus hand-written SVG; a second chart library | Recharts exports `Sankey` with typed node and link props. A second layout engine is more code for the same picture |
| Data | Built on the client from `incomeByCategory`, `expenseByCategory`, `totalIncome` and `totalExpense` of the summary the page already loads | A `flow` field computed by `ReportService` | The items already carry the split proration, refunds and parents, and they sum to the totals to the cent because `ReportingAmount` is `numeric(18,2)` and split lines take the remainder. A server field would duplicate the response |
| Rows | The lists' own cut, extracted from `category-breakdown.tsx` into `breakdownCut(items)` in `components/category-breakdown/category-groups.ts`: `rollUpToGroups`, sorted by `breakdownWeight`, five plus Other. `CategoryBreakdown` and the graph both call it | Six plus Other; a second sort by the period's amount; drawing leaf categories under their groups | One function means every node has a list row above it with the same name and amount, with or without a comparison. Two levels would double the height and tangle the links |
| Refund-heavy categories | A **Money back** node on the left, fed by every rolled-up item whose amount is below zero; the hub is named Money in | Leaving them out under a "not drawn" line; moving them to the income side; clamping to zero | A link cannot be negative. Leaving them out would make Saved differ from the Net stat and from the year review's Saved on the same page. Moving them into the income categories would call money back income, which the refunds decision rejected. A separate node says what happened and keeps Saved equal to net |
| Colour | Income links in `CHART_COLOR_POSITIVE` and expense links in `CHART_COLOR_NEGATIVE`, both at low opacity; nodes in `CHART_COLOR_PRIMARY`; Other, Money back, From savings and Saved in `CHART_COLOR_MUTED` | A colour per category | DESIGN.md's semantic colour rule says charts never use a rainbow to tell rows apart. The label names the row and the direction carries the colour |
| Comparison | Not drawn; only its effect on which five rows are chosen, shared with the lists | Two flows side by side | Two Sankeys cannot be compared by eye, and the lists already show the earlier amounts |
| Phone | Hidden below `md` with Tailwind `hidden md:block` | A narrower variant chosen by a breakpoint hook | There is no breakpoint hook, and effects are not allowed. The phone is secondary (`PRODUCT.md`), and the lists already say the same thing |
| Place | Reports page, full width after the `SplitColumns` of breakdowns and trend, inside the same `StaleRegion`, for any range | Inside the year review; a dashboard card; the month-close summary | The year review appears only for the year presets. The component takes a summary, so the month close or a dashboard card can reuse it in a later change without touching it |
| Labels | Node names through `useCategoryName`, so synthetic groups and Uncategorized are translated as in the lists; Other reuses `dashboard.other` | New label keys | The same words as the list rows next to them |

## Data model

None.

## Backend steps

None.

## Frontend steps

1. **Shared cut.** Move the sort, the five-row limit and the Other fold out of `components/category-breakdown/category-breakdown.tsx` into `breakdownCut(items)` in `category-groups.ts`, returning `{ rows, rest }`. `CategoryBreakdown` keeps its output unchanged.
2. **Pure graph.** `features/reports/money-flow/money-flow-graph.ts` exports `moneyFlowGraph(summary)`. It returns `{ nodes, links, moneyBack, fromSavings, saved }`, and each node carries its `kind` (`income`, `hub`, `expense`, `other`, `moneyBack`, `fromSavings`, `saved`), label, category id, synthetic group and amount. It:
   - moves every rolled-up item below zero into Money back (as a positive amount),
   - takes the rows and the rest from `breakdownCut` over the remaining items, the rest becoming Other,
   - sets Saved to `max(0, net)` and From savings to `max(0, −net)`, where `net = totalIncome − totalExpense`.
   Amounts stay in cents through `toCents`, so the hub balances exactly: left side = income + Money back + From savings, right side = expense items above zero + Saved.
3. **Chart.** `features/reports/money-flow-chart/money-flow-chart.tsx` renders `Sankey` with a custom node renderer that draws the label and `useMoney().format(amount)`, and a custom link renderer that applies the colours from `chart-theme.ts`. `features/reports/money-flow-chart/index.ts` wraps it with `lazyChart` and `ChartSkeleton`, like `features/dashboard/spending-pace-chart/index.ts`. The folder holds its story.
4. **Section.** `features/reports/money-flow/money-flow.tsx` is a `TitledSection` "Money flow" with `className="hidden md:block"`. It contains:
   - the lazy chart inside `<div role="img" aria-label=…>`, with a sentence such as "€3,200 in: €2,450 spent in 8 categories, €750 saved",
   - the Money back line under it, when there is money back,
   - the page's usual empty text when both totals are zero.
5. **Navigation.** The chart's `onClick` passes the node to a handler that calls `navigate({ to: "/transactions", search: { page: 1, categoryId, type, dateFrom, dateTo } })` for nodes with a category id. Synthetic, Uncategorized, Other, Money back, From savings and Saved nodes are not clickable. Keyboard users reach the same targets through the lists, so the chart stays out of the tab order, like the other charts.
6. **Page.** `reports-page.tsx` renders `MoneyFlow` full width after the `SplitColumns`, inside the same `StaleRegion` and view transition. `reports-page/reports-page-pending.tsx` gains a `SectionSkeleton` with a `ChartSkeleton`, also `hidden md:block`.
7. **Text.** English and Lithuanian keys under `reports.moneyFlow`: `title`, `moneyIn`, `saved`, `fromSavings`, `moneyBack`, `ariaLabel` and `moneyBackLine`. Other reuses `dashboard.other`, and category names come from `useCategoryName`.
8. **Stories.**
   - `money-flow.stories.tsx` covers a default month, a deficit month (From savings), expenses only, a month with a refund-heavy category (Money back), income only, empty, and child categories rolled up under a group.
   - The page stories `Loading` and `ServerError` in `reports-page.stories.tsx` now show the section's skeleton and error. A new page story asserts that the section is present. A `play` function asserts the Money back line and that the aria label names the totals. `money-flow-chart.stories.tsx` renders the chart alone.

## Tests

- `money-flow-graph.test.ts` checks:
  - Both sides of the hub are equal in cents in the surplus, deficit and exact cases, and with Money back present.
  - Saved equals `totalIncome − totalExpense` whenever the net is positive.
  - Folding into Other after five items.
  - With a comparison on, the graph's rows equal `CategoryBreakdown`'s rows for the same items.
  - `breakdownCut` gives `CategoryBreakdown` the same rows as before the extraction.
  - The roll-up happens before the Money back split, so a refund-heavy child inside a positive group stays inside the group.
  - Synthetic groups and Uncategorized carry no category id.
  - A period with only expenses gives From savings for the whole amount.
- The story `play` functions run in jsdom through `just test-stories`, like every chart story.

## Docs

- `docs/features/reports.md`: a **Money flow** section covering the nodes, Money back, From savings, Saved equal to net, the shared cut with the lists, which nodes link, and that it is hidden on phones and ignores the comparison.
- `DESIGN.md` §Charts: the Sankey entry, covering link colours and opacity, node colours and label placement.
- `docs/decisions/reports.md`: a Log entry for the client-side graph and the Money back node, with the rejected alternatives above.
- `docs/architecture/accessibility.md`: the Sankey follows the chart rule, with an image label and the lists as the text equivalent.

## What must be true to ship

1. On the seeded ledger, Saved equals the Net stat, and each node's amount equals its list row.
2. Both themes and all four palettes pass the axe contrast check in the stories.

## Open questions

None. Showing the chart in the month-close summary is left to a later change; the component already takes a summary.
