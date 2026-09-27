# Imports: decisions

Related: feature page [Bank statement import](../features/bank-statement-import.md); architecture [Transactions, imports and receipts](../architecture/transactions.md); plan [CAMT.053 statement import](../plans/camt053-import.md).

## Current

Two statement formats, Swedbank CSV and ISO 20022 camt.053 XML, chosen explicitly from the provider list and sharing one preview and one confirm; duplicate references skipped, including deleted imports, with camt.053 references stored unprefixed; strict Swedbank columns with any supported currency; tolerant camt.053 reading that counts unreadable entries; an IBAN mismatch is a warning, not a refusal; explicit transfer matching; no automatic money movement

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-27.** An IBAN that is not the chosen account's is a warning with a "Switch to" button when it belongs to another visible account; a file with several statements reads the one matching the account and refuses with `import.noStatementForAccount` when none does
  - Rejected: Refusing any mismatch
  - Why: A user who has recorded no IBANs must still be able to import a single-statement file
- **2026-09-27.** camt.053 references are stored unprefixed, falling back from the detail's to the entry's servicer reference, the entry reference and the end-to-end id, then to a hash
  - Rejected: Prefixing every camt.053 reference with the format
  - Why: If a bank uses the same id in its CSV and its XML, a user switching formats gets the overlap flagged as duplicates instead of imported twice. To be verified against real Swedbank exports of both formats before release; a prefix is added only if the ids differ and could collide
- **2026-09-27.** A camt.053 entry whose details add up to it becomes one row per detail; otherwise it stays one row with the entry's text. Entries are read tolerantly, without XSD validation, and an unreadable entry is counted rather than failing the file
  - Rejected: Always one row per entry; validating against the schemas
  - Why: Banks book card batches and salary runs as one entry and the details are what the user categorises; banks deviate from the schemas in small ways, as the Flex parser already found
- **2026-09-27.** One pair of routes, `POST /api/import/preview` and `POST /api/import/confirm`, each taking `format`; the format is chosen from the provider list, and the two parsers are static classes behind one preview path in `ImportService`
  - Rejected: Keeping `/swedbank/*` and adding `/camt053/*`; sniffing the format from the file; a second service copying the preview; keyed parser services
  - Why: The app is unreleased and the client is generated, so a clean contract costs nothing; choosing is deliberate entry and a wrong file answers `import.invalidFile` naming the expected format; the duplicate, suggestion, unusual-amount and transfer rules must be identical for both formats; with two formats a branch is less code than an interface and a registration. The generic CSV column mapper moves behind this in the suggested order, since camt.053 covers most EU banks
- **2026-09-20.** `ImportConfirmRow` gained `tagIds`, and the import preview gained a per-row tag picker
  - Rejected: Leaving tags out of the import and telling people to select the imported rows in the ledger afterwards and use `bulk-tags`
  - Why: "A rule sets a tag" would otherwise be a promise the import could not keep: the rows a rule most wants to tag arrive through the import, and the run afterwards could not reach them either, because the same rule would have given them a category and the run only offers uncategorized rows. The write is a few join rows inside the transaction the confirm already opens, and the picker is the tag list the ledger and the form already use
