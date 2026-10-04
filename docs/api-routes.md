# API routes

Generated from `frontend/openapi.json` by `just gen`, one table per tag; `just check-docs` fails when it is stale. Do not edit this page: change an operation's summary in its summary class, and keep notes on routes under [Route notes](api.md#route-notes). How endpoints are written and what an error looks like is in [API surface](api.md).

## Accounts

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create an account |
| GET | `/api/accounts/archived` | List archived accounts |
| GET | `/api/accounts/forecast` | Forecast account balances from recurring entries |
| GET | `/api/accounts/{id}` | Get one account |
| PUT | `/api/accounts/{id}` | Update an account |
| DELETE | `/api/accounts/{id}` | Archive an account |
| GET | `/api/accounts/{id}/reconciliations` | List the reconciliations of an account |
| POST | `/api/accounts/{id}/reconciliations` | Record a statement balance for an account |
| GET | `/api/accounts/{id}/reconciliations/preview` | Preview a reconciliation of an account |
| DELETE | `/api/accounts/{id}/reconciliations/{reconciliationId}` | Delete a reconciliation of an account |
| POST | `/api/accounts/{id}/restore` | Restore an archived account |

## Attachments

| Method | Route | Summary |
| --- | --- | --- |
| DELETE | `/api/attachments/{id}` | Remove a file from a transaction |
| GET | `/api/attachments/{id}/content` | Download a file of a transaction |
| PUT | `/api/attachments/{id}/warranty` | Set the warranty end of a receipt |
| GET | `/api/transactions/{transactionId}/attachments` | List the files of a transaction |
| POST | `/api/transactions/{transactionId}/attachments` | Attach a file to a transaction |

## Auth

| Method | Route | Summary |
| --- | --- | --- |
| POST | `/api/auth/2fa/disable` | Turn two-factor authentication off |
| POST | `/api/auth/2fa/enable` | Finish two-factor enrolment |
| POST | `/api/auth/2fa/setup` | Begin two-factor enrolment |
| POST | `/api/auth/forgot-password` | Ask for a password reset link |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get the signed-in profile |
| GET | `/api/auth/passkeys` | List your passkeys |
| POST | `/api/auth/passkeys` | Finish adding a passkey |
| POST | `/api/auth/passkeys/registration-options` | Begin adding a passkey |
| POST | `/api/auth/passkeys/sign-in` | Sign in with a passkey |
| POST | `/api/auth/passkeys/sign-in-options` | Begin signing in with a passkey |
| PUT | `/api/auth/passkeys/{id}` | Rename a passkey |
| DELETE | `/api/auth/passkeys/{id}` | Remove a passkey |
| POST | `/api/auth/refresh` | Renew the access token |
| POST | `/api/auth/reset-password` | Set a new password from a reset link |
| POST | `/api/auth/send-verification-email` | Send the confirmation email again |
| GET | `/api/auth/sessions` | List signed-in browsers |
| POST | `/api/auth/sessions/revoke-others` | Sign out everywhere else |
| DELETE | `/api/auth/sessions/{id}` | Sign another browser out |
| GET | `/api/auth/tokens` | List your personal API tokens |
| POST | `/api/auth/tokens` | Create a personal API token |
| DELETE | `/api/auth/tokens/{id}` | Revoke a personal API token |
| POST | `/api/auth/verify-email` | Confirm an email address |

## Setup

| Method | Route | Summary |
| --- | --- | --- |
| POST | `/api/setup` | Provision the first administrator |
| POST | `/api/setup/demo-data` | Load demo data |
| DELETE | `/api/setup/demo-data` | Remove the demo data and start for real |
| POST | `/api/setup/finish` | Finish the guided setup |
| GET | `/api/setup/readiness` | Read what this server can run |
| GET | `/api/setup/status` | Check whether first-run setup is needed |

## Backups

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/backups` | List the backups kept on the server |
| POST | `/api/backups` | Take a backup of the whole installation |
| POST | `/api/backups/upload` | Add a downloaded backup to the server |
| PUT | `/api/backups/{id}` | Change the note of a backup |
| DELETE | `/api/backups/{id}` | Delete a backup |
| GET | `/api/backups/{id}/download` | Download a backup file |
| POST | `/api/backups/{id}/restore` | Replace all data with a stored backup |

## Budgets

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/budgets` | List budgets |
| POST | `/api/budgets` | Create a budget |
| GET | `/api/budgets/suggestions` | Suggest budget limits from past spending |
| PUT | `/api/budgets/{id}` | Update a budget |
| DELETE | `/api/budgets/{id}` | Delete a budget |

## Categories

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/{id}` | Update a category |
| DELETE | `/api/categories/{id}` | Delete a category |

## CategorizationRules

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/categorization-rules` | List categorization rules |
| POST | `/api/categorization-rules` | Create a categorization rule |
| POST | `/api/categorization-rules/run` | Run the rules over the ledger |
| POST | `/api/categorization-rules/run/preview` | Count what a run of the rules would touch |
| GET | `/api/categorization-rules/suggested` | List suggested categorization rules |
| POST | `/api/categorization-rules/suggested/dismiss` | Dismiss a suggested categorization rule |
| POST | `/api/categorization-rules/test` | Try a rule against a sample description |
| PUT | `/api/categorization-rules/{id}` | Update a categorization rule |
| DELETE | `/api/categorization-rules/{id}` | Delete a categorization rule |
| POST | `/api/categorization-rules/{id}/move` | Move a rule one place up or down |

## Contacts

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/contacts` | List the people you keep money with |
| POST | `/api/contacts` | Add a person |
| DELETE | `/api/contacts/payments/{id}` | Delete a payment with a person |
| POST | `/api/contacts/splits` | Split an expense with people |
| PUT | `/api/contacts/splits/{id}` | Change a split with people |
| DELETE | `/api/contacts/splits/{id}` | Delete a split with people |
| PUT | `/api/contacts/{id}` | Rename a person |
| DELETE | `/api/contacts/{id}` | Delete a person |
| GET | `/api/contacts/{id}/entries` | List what you shared with a person |
| POST | `/api/contacts/{id}/payments` | Record money between you and a person |

## Conversions

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/conversions` | List currency conversions |
| POST | `/api/conversions` | Convert currency inside an account |
| PUT | `/api/conversions/{id}` | Update a currency conversion |
| DELETE | `/api/conversions/{id}` | Delete a currency conversion |

## Currencies

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/currencies` | List supported currencies |
| GET | `/api/exchange-rates` | Look up an exchange rate |

## Dashboard

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/dashboard/category-breakdown` | Get spending split by category |
| GET | `/api/dashboard/monthly-trend` | Get the monthly income and expense trend |
| GET | `/api/dashboard/summary` | Get the dashboard summary |
| GET | `/api/users/me/dashboard-layout` | Get your dashboard layout |
| PUT | `/api/users/me/dashboard-layout` | Save your dashboard layout |
| DELETE | `/api/users/me/dashboard-layout` | Reset your dashboard layout |
| GET | `/api/users/me/getting-started` | Get your getting started steps |

## Goals

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/goals` | List savings goals |
| POST | `/api/goals` | Create a savings goal |
| PUT | `/api/goals/{id}` | Update a savings goal |
| DELETE | `/api/goals/{id}` | Delete a savings goal |
| PATCH | `/api/goals/{id}/progress` | Update a manual goal's progress |

## Households

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/households` | List households |
| POST | `/api/households` | Create a household |
| GET | `/api/households/{id}` | Get one household |
| PUT | `/api/households/{id}` | Rename a household |
| DELETE | `/api/households/{id}` | Delete a household |
| GET | `/api/households/{id}/audit` | List what members changed in a household |
| POST | `/api/households/{id}/members` | Add a member |
| PUT | `/api/households/{id}/members/{userId}` | Change a member role |
| DELETE | `/api/households/{id}/members/{userId}` | Remove a member |
| GET | `/api/households/{id}/settle-up` | Who owes whom in a household |
| GET | `/api/households/{id}/settlements` | List a household's recorded payments |
| POST | `/api/households/{id}/settlements` | Record that one member paid another |
| DELETE | `/api/households/{id}/settlements/{settlementId}` | Delete a recorded payment |
| GET | `/api/households/{id}/shared-expenses` | List a household's split expenses |
| POST | `/api/households/{id}/shared-expenses` | Split an expense with the household |
| PUT | `/api/households/{id}/shared-expenses/{expenseId}` | Change a split |
| DELETE | `/api/households/{id}/shared-expenses/{expenseId}` | Delete a split |

## Imports

| Method | Route | Summary |
| --- | --- | --- |
| POST | `/api/import/confirm` | Commit previewed statement rows |
| GET | `/api/import/csv-mappings` | List CSV column mappings |
| POST | `/api/import/csv-mappings` | Save a CSV column mapping |
| PUT | `/api/import/csv-mappings/{id}` | Update a CSV column mapping |
| DELETE | `/api/import/csv-mappings/{id}` | Delete a CSV column mapping |
| POST | `/api/import/csv/inspect` | Inspect a CSV file for a column mapping |
| GET | `/api/import/inbox` | List statements waiting in the import inbox |
| GET | `/api/import/inbox/status` | Read the import inbox of this installation |
| DELETE | `/api/import/inbox/{id}` | Remove a statement from the import inbox |
| GET | `/api/import/inbox/{id}/file` | Download a statement waiting in the import inbox |
| POST | `/api/import/preview` | Preview a bank statement |

## Investments

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/investments/allocation-targets` | Get your target allocation |
| PUT | `/api/investments/allocation-targets` | Replace your target allocation |
| GET | `/api/investments/connections` | List your Interactive Brokers connections |
| PUT | `/api/investments/connections/{accountId}` | Connect an account to the Interactive Brokers Flex Web Service |
| DELETE | `/api/investments/connections/{accountId}` | Remove an Interactive Brokers connection |
| POST | `/api/investments/connections/{accountId}/sync` | Download and import the Flex Query report now |
| POST | `/api/investments/import/interactive-brokers` | Import an Interactive Brokers Flex Query report |
| POST | `/api/investments/import/trade-csv` | Import trades from any broker as CSV |
| GET | `/api/investments/portfolio` | Get the investment portfolio |
| GET | `/api/investments/securities` | List securities |
| POST | `/api/investments/securities` | Add a security |
| PUT | `/api/investments/securities/{id}` | Update the details of a security |
| PUT | `/api/investments/securities/{id}/price` | Record a price of a security |
| POST | `/api/investments/securities/{id}/price-symbol/find` | Look up the EODHD symbols of a security |
| GET | `/api/investments/securities/{id}/prices` | List the price history of a security |
| POST | `/api/investments/securities/{id}/prices/import` | Import the price history of one security from a CSV |
| DELETE | `/api/investments/securities/{id}/prices/{date}` | Delete a point of a security's price history |
| GET | `/api/investments/tax-summary` | Get the yearly investment tax summary |
| GET | `/api/investments/tax-summary/export` | Export the yearly investment tax summary as CSV |
| GET | `/api/investments/transactions` | List investment transactions |
| POST | `/api/investments/transactions` | Record an investment transaction |
| PUT | `/api/investments/transactions/{id}` | Correct an investment transaction |
| DELETE | `/api/investments/transactions/{id}` | Delete an investment transaction |
| GET | `/api/investments/value-history` | Get the portfolio value over time |

## MonthClose

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/month-close` | List the close status of every month in a year |
| GET | `/api/month-close/{month}` | Review one month for closing |
| POST | `/api/month-close/{month}` | Close or re-close a month |
| DELETE | `/api/month-close/{month}` | Reopen a closed month |
| PUT | `/api/month-close/{month}/note` | Change the note of a closed month |

## NetWorth

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/assets` | List assets |
| POST | `/api/assets` | Add an asset |
| PUT | `/api/assets/{id}` | Update an asset |
| DELETE | `/api/assets/{id}` | Delete an asset |
| GET | `/api/assets/{id}/valuations` | List the valuations of an asset |
| PUT | `/api/assets/{id}/valuations/{date}` | Record a valuation of an asset |
| DELETE | `/api/assets/{id}/valuations/{date}` | Delete a valuation of an asset |
| GET | `/api/assets/{id}/value-history` | Get the value of an asset over time |
| GET | `/api/debts` | List debts |
| POST | `/api/debts` | Add a debt |
| PUT | `/api/debts/{id}` | Update a debt |
| DELETE | `/api/debts/{id}` | Delete a debt |
| GET | `/api/debts/{id}/balances` | List the recorded balances of a debt |
| PUT | `/api/debts/{id}/balances/{date}` | Record a balance of a debt |
| DELETE | `/api/debts/{id}/balances/{date}` | Delete a recorded balance of a debt |
| GET | `/api/debts/{id}/payment-candidates` | Suggest transactions to link to a debt |
| GET | `/api/debts/{id}/payments` | List the payments of a debt |
| POST | `/api/debts/{id}/payments` | Link a payment to a debt |
| PUT | `/api/debts/{id}/payments/{paymentId}` | Change how a payment counts against a debt |
| DELETE | `/api/debts/{id}/payments/{paymentId}` | Unlink a payment from a debt |
| GET | `/api/debts/{id}/schedule` | Get the repayment schedule of a debt |
| GET | `/api/networth` | Get current net worth |
| GET | `/api/networth/history` | Get the net worth history |
| PUT | `/api/networth/open-balances` | Count open settle-up balances in your net worth |

## Notifications

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/notifications` | List notifications |
| POST | `/api/notifications/read-all` | Mark every notification read |
| PATCH | `/api/notifications/{id}/read` | Mark one notification read |

## Payees

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/payees` | List your payee names |
| PUT | `/api/payees` | Name a payee |
| DELETE | `/api/payees/{id}` | Remove a payee name |

## Diagnostics

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/ping` | Ping the API |

## Receipts

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/receipts/item-categories` | List your remembered receipt item categories |
| DELETE | `/api/receipts/item-categories/{id}` | Forget a remembered receipt item category |
| GET | `/api/receipts/items` | Spending per receipt item |
| POST | `/api/receipts/read` | Read a receipt and propose its items by category |
| PUT | `/api/receipts/{id}/categories` | Keep the categories chosen for a receipt's items |

## RecurringBills

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/recurring-bills` | List recurring entries |
| POST | `/api/recurring-bills` | Create a recurring entry |
| GET | `/api/recurring-bills/calendar` | Lay out one month of recurring entries |
| GET | `/api/recurring-bills/suggestions` | Suggest subscriptions found in the ledger |
| POST | `/api/recurring-bills/suggestions/dismiss` | Dismiss a subscription suggestion |
| GET | `/api/recurring-bills/totals` | Sum what recurring entries cost a month and a year |
| GET | `/api/recurring-bills/{id}` | Get one recurring entry |
| PUT | `/api/recurring-bills/{id}` | Update a recurring entry |
| DELETE | `/api/recurring-bills/{id}` | Delete a recurring entry |
| POST | `/api/recurring-bills/{id}/confirm` | Confirm a due occurrence |
| POST | `/api/recurring-bills/{id}/skip` | Mark a due occurrence as done |

## Reports

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/reports/summary` | Summarise income and expenses over a range |

## Settings

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/settings` | Read installation settings |
| PUT | `/api/settings` | Update installation settings |
| GET | `/api/settings/discord` | Read the installation's Discord channel |
| PUT | `/api/settings/discord` | Save the installation's Discord channel |
| POST | `/api/settings/discord/test` | Send a test message to the Discord channel |
| GET | `/api/settings/exchange-rates` | List the stored exchange rates of a currency |
| POST | `/api/settings/exchange-rates/sync` | Fetch exchange rates now |
| PUT | `/api/settings/exchange-rates/{currency}/{date}` | Enter an exchange rate by hand |
| DELETE | `/api/settings/exchange-rates/{currency}/{date}` | Delete an exchange rate entered by hand |
| GET | `/api/settings/market-prices` | Read the market price settings of this installation |
| PUT | `/api/settings/market-prices` | Save the market price settings of this installation |
| POST | `/api/settings/market-prices/sync` | Fetch closing prices now |
| GET | `/api/settings/public` | Read the settings the sign-in page needs |
| GET | `/api/settings/smtp` | Read the mail server of this installation |
| PUT | `/api/settings/smtp` | Save the mail server of this installation |
| POST | `/api/settings/smtp/test` | Send a test message |
| GET | `/api/settings/telegram` | Read the installation's Telegram group |
| PUT | `/api/settings/telegram` | Save the installation's Telegram group |
| POST | `/api/settings/telegram/test` | Send a test message to the Telegram group |

## Tags

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/tags` | List tags |
| POST | `/api/tags` | Create a tag |
| PUT | `/api/tags/{id}` | Update a tag |
| DELETE | `/api/tags/{id}` | Delete a tag |

## TransactionGroups

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/transaction-groups` | List your transaction groups |
| POST | `/api/transaction-groups` | Group transactions |
| PUT | `/api/transaction-groups/{id}` | Rename or share a transaction group |
| DELETE | `/api/transaction-groups/{id}` | Ungroup |
| GET | `/api/transaction-groups/{id}/members` | List the members of a group |
| POST | `/api/transaction-groups/{id}/members` | Add transactions to a group |
| DELETE | `/api/transaction-groups/{id}/members/{transactionId}` | Remove a transaction from a group |

## Transactions

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Record a transaction |
| POST | `/api/transactions/bulk-account` | Move several transactions to another account |
| POST | `/api/transactions/bulk-category` | Set the category of several transactions |
| POST | `/api/transactions/bulk-delete` | Delete several transactions |
| POST | `/api/transactions/bulk-tags` | Set the tags of several transactions |
| GET | `/api/transactions/export` | Export transactions as CSV |
| GET | `/api/transactions/export/pdf` | Export transactions as PDF |
| GET | `/api/transactions/ledger` | List the ledger with transaction groups folded |
| GET | `/api/transactions/places` | Suggest places used before |
| POST | `/api/transactions/places/rename` | Rename a place or merge several spellings into one |
| POST | `/api/transactions/suggest-category` | Suggest a category for a transaction being entered |
| GET | `/api/transactions/summary` | Total the filtered transactions |
| GET | `/api/transactions/uncategorized-suggestions` | Suggest categories for uncategorized transactions |
| GET | `/api/transactions/{id}` | Get one transaction |
| PUT | `/api/transactions/{id}` | Update a transaction |
| DELETE | `/api/transactions/{id}` | Delete a transaction |
| POST | `/api/transactions/{id}/duplicates/keep` | Keep a transaction and its possible duplicates |
| POST | `/api/transactions/{id}/unusual/dismiss` | Mark an unusual expense as not unusual |
| DELETE | `/api/transactions/{id}/unusual/dismiss` | Mark an expense as unusual again |

## Transfers

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/transfers` | List transfers |
| POST | `/api/transfers` | Create a transfer |
| PUT | `/api/transfers/{id}` | Update a transfer |
| DELETE | `/api/transfers/{id}` | Delete a transfer |

## Trash

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/trash` | List what you deleted recently |
| POST | `/api/trash/restore` | Restore a deleted record |
| POST | `/api/trash/restore-transactions` | Restore several deleted transactions |

## Users

| Method | Route | Summary |
| --- | --- | --- |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create a user |
| PUT | `/api/users/me` | Update your own profile |
| PUT | `/api/users/me/digest-scopes` | Choose which scopes get a monthly digest |
| PUT | `/api/users/me/discord-notifications` | Choose which notifications are posted to Discord |
| PUT | `/api/users/me/email-notifications` | Choose which notifications you are emailed |
| GET | `/api/users/me/export` | Download your own data |
| POST | `/api/users/me/import` | Import a download of your data |
| PUT | `/api/users/me/language` | Save your language |
| PUT | `/api/users/me/telegram-notifications` | Choose which notifications are posted to Telegram |
| POST | `/api/users/{id}/deactivate` | Deactivate a user |
| POST | `/api/users/{id}/reactivate` | Reactivate a deactivated user |
| POST | `/api/users/{id}/reset-password` | Set a new password for another user |
| PUT | `/api/users/{id}/role` | Change a user role |
