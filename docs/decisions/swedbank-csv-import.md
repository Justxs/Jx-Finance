# Imports: decisions

Related: feature page [Swedbank CSV import](../features/swedbank-csv-import.md); architecture [Transactions, imports and receipts](../architecture/transactions.md).

## Current

Duplicate references skipped, including deleted imports; strict Swedbank columns with any supported currency; explicit transfer matching; no automatic money movement

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-20.** `ImportConfirmRow` gained `tagIds`, and the import preview gained a per-row tag picker
  - Rejected: Leaving tags out of the import and telling people to select the imported rows in the ledger afterwards and use `bulk-tags`
  - Why: "A rule sets a tag" would otherwise be a promise the import could not keep: the rows a rule most wants to tag arrive through the import, and the run afterwards could not reach them either, because the same rule would have given them a category and the run only offers uncategorized rows. The write is a few join rows inside the transaction the confirm already opens, and the picker is the tag list the ledger and the form already use
