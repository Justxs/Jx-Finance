# Attachments: decisions

Related: feature page [Attachments](../features/attachments.md); architecture [Transactions, imports and receipts](../architecture/transactions.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-21.** Attached files live in a directory on their own volume, named by the attachment id, with name, type, size and SHA-256 in a row
  - Rejected: A `bytea` column in PostgreSQL; files named after the uploaded name; content-addressed files named by their hash
  - Why: Ten megabytes per file in a row would make every backup snapshot, vacuum and row read heavier and put photographs in the transaction log; a file is streamed from disk without passing through the database. A name from the browser is a path-traversal and collision risk, so it is only shown, never used. Naming by hash would share one file between two uploads of the same receipt, which makes deleting one of them a reference count and a restore of one a question of who else holds it; the id keeps one file per row and the hash is still stored for the ETag and for checking a restored backup
- **2026-09-21.** Removing a file is a soft delete with a trash entry, and `AttachmentPurgeJob` removes the row and the file 30 days after it or its transaction was deleted, together with files no row refers to
  - Rejected: Keeping deleted files forever, as the trash keeps every other deleted row; deleting the file at once and keeping only the row
  - Why: The trash keeps rows because they are small and referenced; a file is up to 10 MB of somebody's photograph that nothing references, so keeping it forever is real cost for a restore that would already answer `restore.expired`. Deleting at once would make Undo a lie. The purge only acts past the window the trash already enforces, so it never removes anything a person could still bring back
- **2026-09-21.** The type of an attached file is read from its first bytes and must agree with the declared type; only JPEG, PNG, WebP, HEIC and PDF are accepted, and the download is always `Content-Disposition: attachment` with `nosniff` and a sandboxing policy, thumbnails being the same address in an `<img>`
  - Rejected: Trusting the declared `Content-Type` or the extension; allowing any file; an inline route for previews
  - Why: A declared type is whatever the client says, and an HTML or SVG file served back from the application's origin is script running as the user. Receipts are pictures and PDFs, so a short allow-list costs nothing real. An image element draws an image regardless of the disposition, so previews need no route that a browser would render as a page
