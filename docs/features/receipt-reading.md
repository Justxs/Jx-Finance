# Receipt reading

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/receipt-reading.md), [attachments](attachments.md), [transactions](transactions.md#create-with-a-split).

Backend `Receipts` (`ReceiptService`, `POST /api/receipts/read`, `PUT /api/receipts/{id}/categories`), the receipt part of `Settings` (`settings/receipts`), `Common/Receipts` (`IReceiptReader`, the request and answer records, `ReceiptApiKey`), `Infrastructure/Receipts` (`AnthropicReceiptReader`, `ReceiptPrompt`, `ReceiptAnswer`, `ReceiptImage`), `Domain/Receipts` and the last step of `AttachmentPurgeJob`; frontend `transactions/receipt-reading` (`fill-from-receipt`, `receipt-review`, `receipt-split.ts`) inside the transaction form, and `settings/receipts-section`. Feature switch `ReceiptReading`, the first switch that starts off.

A grocery receipt is one payment for several kinds of spending. Splitting it by hand means adding up the food and the toothpaste with a calculator, and the discounts and the bottle deposit make that slow. "Fill from receipt" in the transaction form sends the photo or PDF to Anthropic's Claude model, which reads the items and picks one of the person's expense categories for each. The form then gets split lines that add up exactly to the payment. Nothing is saved until the person presses Save on the form, so every rule of [splits](transactions.md#create-with-a-split) applies unchanged.

## Three gates

Reading sends a receipt out of the house, so it only happens when three things are true:

1. The `ReceiptReading` feature switch is on. It is off in a new installation (`FeatureFlags.Default`) and after the migration that added it (`HasDefaultValue(false)`); every other switch starts on. While it is off, `/api/receipts` answers `feature.disabled`.
2. An administrator has enabled reading and saved an Anthropic API key in Settings › Installation › Receipt reading, under a note that says what leaves the server. The answer of `GET /api/settings` carries `receiptReadingReady`, true only when the switch is on, reading is enabled and a key is stored; the form shows the action only then.
3. A person clicks. The action sits in the form of an expense, with "The file is sent to Anthropic to be read." under it. Nothing is read on upload, by a job or for another person.

## The flow

```mermaid
flowchart TD
    Create["Add transaction dialog"] -->|"Fill from receipt: pick a file"| Upload["POST /api/receipts/read<br/>file, never stored"]
    Edit["Edit dialog"] -->|"pick an attached file, or choose another,<br/>which is attached first"| Attached["POST /api/receipts/read<br/>attachmentId"]
    Upload --> Service
    Attached --> Service
    Service{"stored reading for this user<br/>and file content?"} -->|"yes, not forced"| Cached["answer it, cached: true, no call"]
    Service -->|"no, or Read again"| Ready{"reading ready?"}
    Ready -->|"no"| NotConfigured["400 receipt.notConfigured"]
    Ready -->|"yes"| Prepare["turn upright, strip metadata, shrink;<br/>first 3 pages of a PDF"]
    Prepare --> Count{"under AppLock.ReceiptReadings:<br/>busy? limit reached?"}
    Count -->|"busy"| Busy["409 conflict.busy"]
    Count -->|"limit"| Limit["429 receipt.limitReached"]
    Count -->|"count the read, insert Pending"| Call["Claude reads the file and picks<br/>a category number per item"]
    Call --> Store["map numbers to category ids, apply<br/>remembered categories, store the reading"]
    Store --> Review["review dialog: items by category,<br/>resulting lines, differences"]
    Cached --> Review
    Review -->|"Use these lines"| Learn["PUT /api/receipts/{id}/categories"]
    Learn --> Form["form gets amount, date, description (create)<br/>and the category or the split lines"]
    Review -->|"Split that payment instead"| Candidate["attach the file to the existing expense,<br/>open its edit dialog with the lines"]
```

In the create dialog the picked file is kept in the page's state. When the transaction is saved, including with "Save and add another", the page uploads it as an attachment of the new transaction; a failed upload leaves the transaction saved and shows "Saved, but the receipt was not attached" with the server's reason. In the edit dialog the action lists the transaction's files, newest first and preselected, and "Choose another file" uploads a new one through the ordinary attachment endpoint before reading it.

The read runs inside the request and takes 5 to 60 seconds. While it runs, the action says "Reading the receipt, this can take up to a minute" and has a Cancel button that aborts the request. A cancelled read still counts, because the provider may already bill it, and the reading is marked failed so the next click is not refused as busy.

## What is sent

One Messages API call to `https://api.anthropic.com`, fixed in code so an administrator session cannot point the stored key at another server. The request carries:

- the prepared image, or the first pages of the PDF as a document block;
- the instructions, kept in `ReceiptPrompt.Instructions`, and after them the numbered list of the caller's expense category names ("1. Food", "2. Hygiene"), the ones visible in the current household scope, ordered by name;
- a JSON schema for the answer (structured outputs), whose `category` field only allows the numbers of that list or null, so the model cannot return a category the person does not have.

No account name, amount from the ledger, user id or `metadata.user_id` is sent. The instructions say to copy names and amounts as printed, take the line total of weight lines such as `1,236 kg x 1,49`, attach a "Nuolaida" or "Užstatas" line to the item above it, put discounts on the whole receipt, loyalty discounts, bottle-return vouchers and rounding in `adjustments`, ignore the VAT summary, payment, change and loyalty point lines, choose a category only when it clearly fits, mark a return receipt, and treat everything written in the image as receipt content, never as an instruction.

The model is one of a fixed list, chosen by the administrator: `claude-sonnet-5` (the default), `claude-haiku-4-5` or `claude-opus-5-5`. Sonnet 5 and Opus 5.5 run with adaptive thinking at effort `low`; Haiku 4.5 runs without thinking. The SDK client has a 60 second timeout and one retry, which the SDK makes on 408, 409, 429 and 5xx answers. 401 and 403 become `receipt.keyRejected`; every other provider error, a timeout and a network failure become `receipt.providerFailed` (502). A `refusal` or `max_tokens` stop reason, and an answer that fails the checks below, become `receipt.unreadable`. The log records the model, the stop reason and the token counts, never the image or the answer.

The API key is unprotected per call by the service, with Data Protection purpose `JxFinance.Receipts.ApiKey`, and handed to the reader; `ReceiptRequest` prints it as `***`.

## Image and PDF preparation

`ReceiptImage.Prepare` works in memory on a file of at most 10 MB and reads it only as the format `AttachmentContent.Detect` found, with Magick.NET's width and height limited to 16000 pixels:

- JPEG, PNG, WebP and HEIC are turned upright from their EXIF orientation, stripped of every metadata profile (so the GPS position of the photo does not leave), refused below 200 pixels on the short side, shrunk to the model's long edge (2576 pixels, 1568 for Haiku), flattened on white and written as JPEG at quality 90.
- A PDF of up to three pages is sent as it is. A longer one is cut to its first three pages with PDFsharp, and the review says "Only the first 3 of 7 pages were read". An encrypted or unreadable PDF answers `receipt.unsupportedFile`.

HEIC decoding comes with Magick.NET's native library, which also decodes AVIF, JPEG XL and others; the reader never asks for those because the attachment rules refuse them first. No HEIC sample is committed: the library cannot write HEIC and no real photo goes into the repository, so the unit test checks that the shipped library reads the format.

## The answer and its checks

`ReceiptAnswer.Parse` reads the model's JSON and refuses it as `receipt.unreadable` when an amount has more than two decimals or does not fit `numeric(18,2)`, an item's amount, discount or deposit is negative, an item has no name, or there are more than 200 items or 20 adjustments. It is lenient where a wrong value does no harm: text is cut to 200 characters (quantity to 40), an unknown currency and a date that is not `YYYY-MM-DD` are read as missing, and a category number outside the list is read as no category.

The stored reading (`ReceiptReading.Result`, `jsonb`) has the merchant, date, currency, printed total, `isReturn`, the pages read and the page count, the items (name, quantity as printed, amount, discount, deposit, category id, remembered) and the adjustments (kind `discount`, `voucher`, `rounding` or `other`, label, signed amount).

## From items to lines

The arithmetic runs in the browser, in `receipt-split.ts`, because the lines change as the person moves items between categories. The server checks the saved lines as it checks any split.

- An item's weight is its printed amount minus the discount printed under it plus the deposit printed under it, never below zero. The deposit stays with its drink.
- Items are grouped by the category chosen for them; items without one form an uncategorized group.
- The payment is shared across the groups in proportion to their weights, in cents, by largest remainder; a tie on the remainder goes to the larger group, then to the first. A group that rounds to zero is dropped. When one group is left, the form gets that category and no split.
- The amount shared is the form's amount in the edit dialog. In the create dialog the form first takes the receipt's total, currency (when it is usable in this installation), date and merchant as description.
- A line's description is the short names of its items (the words before the first digit or quote), joined with commas and cut to 500 characters.

One rule covers the loyalty-card discount, a coupon on the total, a bottle-return voucher, cash rounding, a receipt in another currency and a misread cent, and the lines always add up exactly to the payment, which the split validator demands.

### Worked example

The receipt, as `backend/JxFinance.Tests/Support/Receipts/maxima-2026-09-26.txt` holds it: seven items and a loyalty discount of −0.50 on the whole receipt, total 18.21 EUR.

| Item | Amount | Discount | Deposit | Weight | Category |
| --- | --- | --- | --- | --- | --- |
| Duona "Bočių" 800 g | 1.89 | | | 1.89 | Food |
| Pienas 2,5 % 1 l (2 x 1,19) | 2.38 | | | 2.38 | Food |
| Sūris "Džiugas" 180 g | 4.29 | 0.86 | | 3.43 | Food |
| Bananai (1,236 kg x 1,49) | 1.84 | | | 1.84 | Food |
| Mineralinis vanduo 1,5 l | 0.79 | | 0.10 | 0.89 | Food |
| Colgate dantų pasta 75 ml | 3.49 | | | 3.49 | Hygiene |
| Head&Shoulders šampūnas 250 ml | 5.99 | 1.20 | | 4.79 | Hygiene |

Food weighs 10.43 and Hygiene 8.28. With the adjustment the items add up to 18.21, the printed total and the payment, so the review shows no difference. The payment of 1821 cents gives Food 1821 × 1043 / 1871 = 1015.13 and Hygiene 805.87 cents; the whole parts leave one cent, which goes to the larger remainder, Hygiene. The lines are **Food 10.15 EUR** ("Duona, Pienas, Sūris, Bananai, Mineralinis vanduo") and **Hygiene 8.06 EUR** ("Colgate dantų pasta, Head&Shoulders šampūnas"). Had the bank charged 18.31 EUR, the same rule gives **Food 10.21** and **Hygiene 8.10**. `receipt-split.test.ts` checks both.

## The review

A dialog titled "Receipt from MAXIMA LT, UAB, 26 Sep 2026" lists the items under their category, each with its quantity, discount and deposit, the category combobox and a "Remembered" tag where the person's earlier choice decided. Below them are the adjustments, the resulting lines ("Food €10.15 · Hygiene €8.06 · €18.21") and the differences, in words and never by colour:

- "The items add up to 18.11 EUR, the receipt says 18.21 EUR." when the items and adjustments differ from the printed total, which points at a misread line.
- "Receipt 18.21 EUR, this payment 18.31 EUR; the lines are scaled to the payment." when the payment differs from the receipt, or its currency does.

A difference never blocks. The actions are "Use these lines", "Read again" (with "This counts as another read") and Cancel. A return receipt shows "Return receipts cannot be split yet." and "Use these lines" is disabled; money back is a [refund](transactions.md#refunds), which cannot be split.

In the create dialog the reading of a new file also answers up to three visible, unsplit expenses with the receipt's total in its currency, dated within three days of the receipt, nearest first. The review shows them as "Already in the ledger? MAXIMA LT, UAB VILNIUS, 27 Sep 2026, €18.21" with "Split that payment instead", which attaches the file to that expense, closes the create dialog and opens the expense's edit dialog with the proposal; the edit form merges that prefill over the saved transaction. The other order needs nothing new: a transaction created from a receipt is an ordinary hand-entered expense, and the next bank import [links it](bank-statement-import.md#entries-you-already-made-by-hand) (same account, amount and currency, within three days), setting its import reference and keeping its lines.

## Cache, busy and the limit

A reading belongs to the person who made it and the file's SHA-256. Reading the same content again answers the stored reading with `cached: true`, costs nothing and needs no key; "Read again" (`force`) makes a new call and, when it succeeds, removes the earlier reading. A household member who can see an attachment can read it and gets a reading of their own, with their own categories.

Before the call, in one short transaction under `AppLock.ReceiptReadings`, the service refuses with `conflict.busy` when the same person's same file has a `Pending` reading younger than five minutes, and with `receipt.limitReached` (429) when this month's count has reached the installation's monthly limit (default 100, 1 to 10000). Otherwise it adds one to the month's `ReceiptReadingUsage.Readings`, inserts the `Pending` reading and commits. Counting first means a timeout, a cancel or a failed answer still counts, which is what the provider bills. The tokens of a successful answer are added to the month afterwards. A `Pending` reading older than five minutes counts as failed. The endpoint is also throttled to 30 calls per five minutes per client.

## Learning

"Use these lines" sends every item's category to `PUT /api/receipts/{id}/categories`. The service checks each category with `IReferenceGuard` as an expense category the caller can see, stores the choices in the reading and keeps one `ReceiptItemCategory` per item name: `ReceiptItemKey.Normalize` lowercases the name, keeps letters with their diacritics and drops digits, units (g, kg, l, ml, vnt and the like) and punctuation, so `PIENAS 2,5% 1L` and `Pienas 2.5 % 1 l` are both `pienas`. An item set back to no category forgets its name. The dictionary keeps at most 5000 names per person and drops the least recently used first.

After the model answers, a remembered category replaces its choice and the review tags the item "Remembered". A remembered category that was deleted or is no longer visible is ignored, and comes back when the category is restored. The dictionary is never sent to the model.

## Settings

Settings › Installation › Receipt reading (`GET` and `PUT /api/settings/receipts`, administrators only) holds the enabled switch, the API key as a password field with "A key is saved" as its placeholder (empty keeps the stored key), the model with the rough price of a receipt beside it, the monthly limit and "This month: 23 of 100 reads". "Test the key" (`POST /api/settings/receipts/test`, 10 calls per five minutes) asks the Models API for the chosen model with the stored key, which costs nothing, and answers `receipt.keyRejected`, `receipt.keyUnreadable` or `receipt.providerFailed`. The key is protected with ASP.NET Data Protection, travels in a backup as ciphertext and answers `receipt.keyUnreadable` under another key ring, like the SMTP password. It never appears in a response or a log record.

The note above the form says: receipt reading sends the photo or PDF of a receipt to Anthropic, a company in the United States; the photo is re-encoded first, so its location and camera details are not sent; the names of the expense categories go with it and nothing else from the ledger does; by default Anthropic does not train its models on data sent to its API and keeps that data only as its commercial terms allow; a receipt shows what was bought, where and when, including pharmacy items.

## Retention

A reading lives while its file does. The last step of `AttachmentPurgeJob` deletes readings older than 24 hours that failed or are still pending, and those whose SHA-256 is no longer the hash of any attachment row, trashed ones included; 500 at a time, with `Retention.PurgeAsync`. So a reading survives a file moved to the trash and goes when the file is purged, and a reading of an uploaded file that was never attached goes after a day. Readings are hard-deleted and never enter the trash; the usage rows are not touched, so the month's count cannot shrink. The dictionary stays until the person changes an entry. The three tables are part of every backup.

## Errors

| Code | Status | When |
| --- | --- | --- |
| `feature.disabled` | 404 | The `ReceiptReading` switch is off |
| `receipt.notConfigured` | 400 | Reading is not enabled or no key is stored |
| `receipt.limitReached` | 429 | The installation's reads for this month are used up |
| `receipt.unsupportedFile` | 400 | Not a readable image or PDF, a password-protected PDF, a photo under 200 pixels, or an attachment whose file is gone |
| `receipt.unreadable` | 400 | The model refused, ran out of room, or answered something that fails the checks |
| `receipt.providerFailed` | 502 | Anthropic could not be reached, timed out, was rate limited or failed |
| `receipt.keyRejected` | 400 | Anthropic refused the key |
| `receipt.keyUnreadable` | 400 | The stored key cannot be decrypted with this key ring |
| `receipt.modelNotAllowed` | 400 | A model outside the fixed list |
| `conflict.busy` | 409 | The same person's same file is being read |
| `attachment.*` | 400 | The uploaded file is empty, over 10 MB, of a refused type or does not match its declared type |

## Tests

Unit tests cover `ReceiptItemKey.Normalize`, the answer checks, `ReceiptImage` (orientation 6 comes out upright without EXIF, the long edge, a tiny photo, HEIC support, a five-page PDF cut to three, an encrypted PDF) and `AnthropicReceiptReader` against a stub `HttpMessageHandler` serving a recorded answer (`Support/Receipts/anthropic-message.json`): the request shape, Haiku without thinking, a PDF as a document block, the parsed items and tokens, refusal and `max_tokens`, 401, 403, 404, 429 and 529 after one retry, a network failure, and the key check. Integration tests replace `IReceiptReader` with `FakeReceiptReader`, which answers the committed fixtures (Maxima, Rimi, Iki and a return receipt, each as text for people and as the model's JSON) with their category numbers mapped by name, records the calls and can hold or fail. No test and no check calls Anthropic.

## Before release

Read 20 real receipts from the household's own shops, Maxima, Rimi, Iki, Lidl and a pharmacy, some crumpled and some photographed at an angle, on each of the three models. Record here how many totals matched the printed total, how many items needed a category change and the measured cost of a receipt from the token counts in `ReceiptReadingUsages`, then confirm or change the default model. The prices in the model list (about 0.01, 0.03 and 0.07 USD a receipt) are estimates until then.
