# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner and the few people in their household. They are trusted, invited by an administrator, and already know what the product is for. Nobody arrives cold.

The main situation is a sit-down session at a desktop computer, weekly or monthly: import the Swedbank CSV, review and categorize rows, record anything the bank did not see, then check balances, budgets, upcoming bills and reports. The phone is secondary and is used for the occasional quick entry or lookup.

## Product Purpose

Jx Finance is a self-hosted EUR ledger for personal finances and small households. It records income, expenses, transfers, assets and debts, and turns them into balances, budgets, goals, net worth and reports. It never connects to a bank and never moves money.

Success is a ledger the household trusts: every figure is exact, every row can be traced and corrected, and a bookkeeping session ends with a clear answer to "where did the money go and are we on plan".

## Positioning

A private ledger that the household runs itself. Data stays in its own PostgreSQL database behind a loopback or private-network deployment. Entry is deliberate: manual rows or a reviewed CSV import, never an automatic bank feed. Shared accounts and categories let a household keep one set of books without giving up personal ones.

## Operating Context

- Swedbank EUR CSV statements are the main bulk input. Import is a review step: preview, row selection, category choice, transfer matching and duplicate detection.
- Money is always EUR. Entry accepts comma decimals. Dates and numbers follow the chosen locale.
- The interface is English and Lithuanian. Lithuanian labels and bank descriptions are long and use diacritics (ą č ę ė į š ų ū ž).
- Recurring bills raise in-app reminders; confirming one creates the expense.
- Goals are updated by hand. Net worth combines account balances with manually kept assets and debts.
- Reports cover custom date ranges and export to CSV and PDF.
- Roles: an administrator creates users; members manage their own and shared books.

## Capabilities and Constraints

- Routes: dashboard, transactions, import (Swedbank CSV review with bulk selection, bulk category and category recall), accounts (with transfers), categories, budgets, goals, net worth, recurring bills, households, reports, users (admin), profile (password, 2FA), login, first-run setup.
- Light and dark themes are both first-class.
- No third-party network requests. The Content-Security-Policy allows scripts, fonts and connections from the same origin only; fonts must be bundled.
- Out of scope for the product: bank APIs, multi-currency, investment prices, tags, categorization rules, PWA/offline, email delivery.
- Frontend conventions that design work must respect: React Compiler (no manual memo hooks or effects), no code comments, function declarations, shadcn/ui components on Base UI, Storybook stories for every component.

## Brand Commitments

- Name: Jx Finance.
- Income reads green and expense reads red everywhere money is signed.
- The logo is the "Jx" mark: serif letters on a navy tile with the "x" standing on a double total rule, followed by "Finance" in the lockup. Assets live in `frontend/public` and `frontend/src/components/brand`; usage rules are in DESIGN.md.
- Brand typefaces are Source Serif 4 and Source Sans 3; brand colors are Ledger Navy and paper.

## Evidence on Hand

- Deterministic fixtures and MSW handlers in `frontend/src/storybook` render every route with realistic Lithuanian household data, including empty, loading and error variants.
- Product documentation in `docs/`.
- No marketing material, testimonials or external users exist; none may be invented.

## Product Principles

1. The numbers are the content. Amounts, balances and dates must be exact, aligned and the easiest thing on the screen to read.
2. Built for the bookkeeping session. Favor density, scanning and keyboard-friendly flows over first-impression spectacle.
3. Every figure is traceable. A total should lead to the rows behind it, and every row can be corrected.
4. Deliberate entry. Imports and destructive actions are reviewed before they change the ledger.
5. Private and self-contained. Nothing in the interface depends on an outside service.

## Accessibility & Inclusion

WCAG 2.1 AA contrast in both themes, full keyboard operation, visible focus, reduced-motion support, and money direction conveyed by sign as well as color. Layouts must hold Lithuanian string lengths without truncating meaning.
