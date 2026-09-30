# Plan: Privacy mode (hide amounts)

Status: planned 2026-09-30, reviewed against the code the same day. Size S. Frontend only: no endpoint, no migration and no feature switch. It is a per-browser preference like the theme. Build after nothing.

## Outcome

- **Hide amounts** replaces the digits of every money amount on screen with `•••••` and keeps the currency sign and the plus or minus sign, for example `€•••••` or `−€•••••` in English and `−••••• €` in Lithuanian. It is available from:
  - the account menu,
  - Appearance in Settings (`/profile?section=appearance`),
  - the command palette,
  - the `p` key.
- Compact chart axes lose their magnitude suffix too, so `€1.2k` becomes `€•••••`, not `€•••••k`.
- Investment prices and quantities are hidden too, because together they reveal a holding.
- These stay visible, because a ratio does not say how much money there is:
  - percentages and the split ratio of an investment split,
  - budget and goal meters,
  - chart shapes.
- Form inputs keep their real values. Opening an edit dialog is a deliberate look at one row, and a masked input cannot be edited.
- Exports, emails, Discord messages and the monthly digest are unchanged. They leave the screen on purpose.
- Raw text is not parsed for amounts and stays visible, like inputs:
  - bank descriptions and notes,
  - the sample rows of the CSV column mapping and of the broker trade CSV,
  - the receipt review's unread lines.
- The choice is kept per browser, so a laptop used in a café can keep it on while the desktop at home does not. It is in force on the first render after a reload, because the preference collection reads local storage synchronously.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Mechanism | The mask is applied in `hooks/use-formatters.ts`, inside `useCurrencyFormat` (behind `useMoney` and `useAxisMoney`), `usePriceFormat` and `useQuantityFormat`. About 71 non-test files use these four hooks | A CSS blur on amount elements; a `<Money>` wrapper at every call site | A blur leaves the number in the DOM, in copy and paste, in screen readers and in a screenshot at low blur. Every amount already goes through these hooks, including the translated sentences that interpolate one, such as the bell, the unusual-amount badge and the refund mark. One change covers them all |
| Mask | Format the real value with `formatToParts`, then replace the run from the first to the last `integer`, `group`, `decimal`, `fraction` or `compact` part, including literals inside it, with one `•••••`. `minusSign`, `plusSign`, `currency` and the literals outside the run stay | Formatting `0` and masking that | Formatting zero drops the sign, because `Intl` puts it in its own part, so a negative amount would read as positive. Merging the run keeps Lithuanian compact output, `1,2 tūkst. €`, to one mask |
| Screen readers | The mask is plain text, and a screen reader reads the bullets | `aria-label` on the amount elements | Stories run axe with `a11y: { test: "error" }`, and `aria-label` on a generic `<span>` fails `aria-prohibited-attr`. Visually hidden text in every amount component would touch dozens of cells for a mode meant for the screen |
| Scope | Per browser, in `jx-preferences` | Per user on the server | It protects a screen, not a person. The theme, the palette and now the rows per page follow the same rule (`docs/decisions/interface.md`, 2026-09-19) |
| Key | Bare `p`, ignored while a field has focus like `n`, `/` and `?`; no `g p` sequence exists | `h`; a `Mod+` chord | `h` is the second key of `g h` and would fire on it too. `Mod+K` is deliberately the only chord in the scheme (`docs/decisions/interface.md`, 2026-09-21) |
| Menu row | The account-menu pattern: a fixed label "Amounts" with its current value, Shown or Hidden, as a badge. The command palette entry reads Hide amounts or Show amounts | A label that flips | The menu names each setting with its current value (`docs/decisions/interface.md`, 2026-09-28). The palette lists actions |
| Inputs and raw text | Real values; descriptions, notes and file samples are not scanned for numbers | Masked inputs with a reveal button; masking every digit on screen | Editing is looking, and a reveal button per field is more code for a case the user starts on purpose. Masking every digit would also hide dates, counts and account numbers the reader needs. The mode hides the amounts the app formats |
| Turning itself on | Never; only the person switches it | Switching on after a period without input | It would be the first timer in the interface, and a shared family computer is better served by signing out |

## Data model

None.

## Backend steps

None. Every masked amount is formatted in the browser.

## Frontend steps

1. **Preference.** `stores/preferences.ts` gains `amountsHidden: z.boolean().catch(false)`. `stores/privacy-store.ts`, copied from the shape of `stores/sidebar-store.ts`, exports `toggleAmountsHidden()` and `useAmountsHidden()`. Every formatter hook then subscribes to the preference row; that is one more live-query subscription in about 71 components, which is acceptable because the row changes only on a toggle.
2. **Mask helper.** `lib/mask-amount.ts` exports `maskParts(parts: Intl.NumberFormatPart[])`, which does the run replacement in the decision above, and `maskDigits(text)`, which replaces digit runs with separators inside a free sentence.
3. **Formatters.** In `hooks/use-formatters.ts`:
   - `useCurrencyFormat`'s `format` returns `maskParts(formatter.formatToParts(value))` while the mode is on. `formatSigned` keeps its sign logic.
   - `usePriceFormat`'s returned function does the same.
   - `useQuantityFormat` returns `{ format(value) }` instead of the shared `Intl.NumberFormat`, masking when on. Its nine `.format` call sites keep compiling unchanged.
   - `features/investments/activity-section.tsx` formats the split ratio with `useNumberFormat` instead, so a ratio stays visible.
4. **Bypasses.**
   - `features/transactions/use-filter-summaries.ts` formats the amount-range chips with `useNumberFormat`. It gains a `useMaskedNumber` wrapper next to it, built on `maskParts`.
   - `components/notification-bell/notification-bell.tsx` falls back to the server's `notification.message` in several branches, and that text may hold amounts. While the mode is on, it passes the fallback through `maskDigits`.
5. **Controls.**
   - `components/account-menu/account-menu.tsx` gains the Amounts row after Theme: an `Eye` or `EyeOff` icon, the label and the current value in the muted `<span>` the other rows use. It has `closeOnClick={false}` like Language and calls `toggleAmountsHidden`.
   - `components/appearance-picker/appearance-picker.tsx` gains a `ChoiceGroup name="amounts"` with Shown and Hidden, like the theme choice.
   - `features/command-palette/command-entries.ts` gains a `CommandTarget` of `{ kind: "amounts" }`, labelled Hide amounts or Show amounts. `CommandSources` carries the flag, and the dispatcher in `command-palette.tsx` gains its case.
   - `lib/shortcuts.ts` gains `{ id: "privacy", keys: ["p"], labelKey: "shortcuts.privacy", group: "actions", action: { type: "privacy" } }`, and `runAction` handles the new type. The help dialog lists it through `visibleShortcuts()` without further work.
6. **Text.** English and Lithuanian keys, in the `appearance.*` namespace the menu already uses: `appearance.amounts`, `appearance.amountsStates.shown`, `appearance.amountsStates.hidden`, `commandPalette.hideAmounts`, `commandPalette.showAmounts` and `shortcuts.privacy`.
7. **Storybook.** `.storybook/preview.tsx` gains an `amounts` global next to `locale`, as a toolbar toggle. Its loader writes `amountsHidden` before every story, so the flag never leaks from one story into the next. The `account-menu` and `appearance-picker` stories cover both states, each with a `play` that toggles the choice and finds a masked amount in a rendered `TransactionAmount`.

## Tests

- `hooks/use-formatters.test.tsx` checks the masking:
  - In `en` and `lt`, positive and negative values keep the currency symbol on the locale's side and keep the minus sign.
  - Compact values in both languages give exactly one mask.
  - Price and quantity are masked.
  - With the mode off, every output is identical to today's.
- `lib/mask-amount.test.ts`: `maskParts` on hand-built part lists; `maskDigits` on a sentence with a date and an amount (the date is masked too, which is acceptable in the bell).
- `lib/shortcuts.dom.test.ts`: `p` toggles the preference, and is ignored in a field and while a dialog is open (`shouldIgnoreShortcut`).
- `stores/privacy-store.dom.test.ts`, like `sidebar-store.dom.test.ts`: toggling writes the preference and `useAmountsHidden` follows it.
- `command-entries.test.ts`: the entry label follows the state.
- `stores/preferences.dom.test.ts`: the defaults gain `amountsHidden: false`.
- A dom test renders the components that show most amounts with the mode on and checks that no digit sits next to a currency symbol. The components are:
  - `TransactionAmount`, `SummaryStats`, `BreakdownList`, `ShareBars` and `ChartTooltip`,
  - the year review table, the positions table and the receipt items list,
  - the portfolio's allocation and return,
  - the forecast with a tried payment,
  - the month-close drift panel.

## Docs

- `docs/features/interface.md`: a **Hide amounts** section covering what is hidden, what is not (inputs and raw text included), the key and where the switch lives.
- `docs/decisions/interface.md`: a Log entry for masking the parts in the formatter over a blur or a zero, for plain-text bullets over labels, and for per-browser scope.
- `docs/architecture/visual-system.md`: the mask glyph, the merged run, and that tables keep their column widths.
- `docs/architecture/accessibility.md`: screen readers read the bullets in this mode.
- `docs/scope.md` §UI: one clause.

## What must be true to ship

1. The dom test above passes. Reviewing the route stories with the Storybook toggle on shows no money digits outside form inputs.
2. With the mode off, the formatter tests show byte-identical output.

## Open questions

None.
