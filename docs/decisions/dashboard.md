# Dashboard: decisions

Related: feature page [Dashboard](../features/dashboard.md).

## Current

Per user, on the user row as a nullable `jsonb` column of card id strings; the published `DashboardCard` enum is the id set; unknown ids are dropped on read and cards a layout does not mention are appended in default order; feature switches are applied by the client and never rewrite the stored layout; hidden cards neither render nor load; reordering is by move up and move down buttons, no drag and drop

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-21.** The dashboard layout is a nullable `jsonb` column `DashboardLayout` on `AspNetUsers`, holding the order and the hidden set as card id strings
  - Rejected: A `DashboardLayouts` table keyed by user; two `text[]` columns; storing it per browser in a TanStack DB collection like saved filters
  - Why: The only existing per-user preference, `BillReminderEmails`, is a column on the user row, and a layout has exactly one owner and no identity of its own, so a table would add a key, a foreign key and a join for one value. One `jsonb` value is written and read whole, as it is used, and a second list later (a width per card, say) is a field rather than a migration. Per-browser storage was what the backlog asked to avoid: the layout is meant to follow the person to a phone. Strings rather than the enum's numbers keep a stored layout readable when a card is added or removed
- **2026-09-21.** Unknown card ids in a stored layout are dropped on read, and a known card the layout does not mention is appended after the saved ones in default order; a request with an unknown or repeated id is refused with `dashboard.cardUnknown` or `dashboard.cardDuplicate`
  - Rejected: Failing the read of a layout with an unknown id; inserting a new card at its default position between the saved ones; accepting and dropping unknown ids on save
  - Why: A layout written by another version must never break the dashboard, and the read cannot ask the user anything. Inserting a new card between cards the user arranged would quietly change an order they chose, while the end of the list is predictable and makes the new card noticeable. On save the client is the one that picked the ids, so an unknown one is a bug worth a field-level answer rather than silence; the request takes strings instead of the enum for exactly that reason, since an unknown enum value fails deserialisation with a whole-body `request.malformed`
- **2026-09-21.** Feature switches are applied by the client, and a card whose feature is off keeps its stored place and hidden flag; moving a card steps over such cards without moving them
  - Rejected: Filtering switched-off cards out on the server; dropping them from the saved layout when the user saves
  - Why: Switching a feature off deletes nothing anywhere else in the product, and the layout should behave the same: when the feature comes back, so does the card, where the user left it. The client already reads the switches for the navigation and needs the card list to render, so a second copy of the mapping on the server would only be another place to keep in step
- **2026-09-21.** The route loader reads the layout and the settings in parallel and warms only the queries of the cards that will be shown; the customise mode replaces the grid instead of overlaying it
  - Rejected: Warming every card's queries as before and only hiding the markup; editing the layout in place on the live grid
  - Why: Hiding the markup of a card whose data is still fetched saves nothing, and the point of hiding a card on a slow phone is not to pay for it. Editing on the live grid would mount every card, hidden ones included, just to offer them, and would move charts under the pointer while the user is still choosing
- **2026-09-21.** Cards are reordered with Move up and Move down buttons on each row; there is no drag and drop
  - Rejected: Adding `@dnd-kit` with its keyboard sensor; drag and drop only
  - Why: Nine rows are few enough that two buttons per row are quick, and buttons work the same for a pointer, a keyboard, a touch screen and a screen reader without a second interaction model or a new dependency. Focus stays on the pressed button, or moves to the opposite one when the card reaches an end, and a polite status says the new position, which is the part a drag-and-drop library would have had to be configured to do anyway
- **2026-09-21.** Saving or resetting the layout writes the answer into the query cache and invalidates nothing; both mutations are listed in `mutationsWithoutInvalidation`
  - Rejected: Invalidating the layout query after either mutation
  - Why: The response is the complete new layout and no other query depends on it, so a refetch would only repeat what was just answered and, in the meantime, show the old order for a moment after the customiser closes
- **2026-09-20.** The dashboard month figures, monthly trend and spending breakdown include the same investment flows as the report
  - Rejected: Leaving the dashboard on transactions only
  - Why: The dashboard month and the report for that month are the same question and showed the same number before; two answers would read as a bug. Budgets stay on categorized transactions because a budget belongs to a category, and the CSV and PDF exports stay transaction exports
