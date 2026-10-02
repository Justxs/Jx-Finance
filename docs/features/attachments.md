# Attachments

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/attachments.md), [architecture: Transactions, imports and receipts](../architecture/transactions.md).

Backend `Attachments` (`AttachmentService`, four endpoints), `Common/Attachments/AttachmentContent`, `Infrastructure/Attachments/AttachmentStore` and `AttachmentImage`, and `RetentionJob`; frontend `transactions/transaction-attachments`, shown under the form of the transaction edit dialog, and a paperclip with a count in the ledger. A receipt, an invoice or a warranty card belongs with the payment it explains. Until now the only place for it was the description field, so the paper went into a drawer and the photo into a phone gallery, and neither came back when the payment was questioned. A transaction now carries up to ten files, which are kept on a volume next to the database, go into every backup, and follow the transaction's visibility, trash and audit rules exactly as its own fields do.

## The model

```mermaid
erDiagram
    TRANSACTION ||--o{ TRANSACTION_ATTACHMENT : "carries"
    USER ||--o{ TRANSACTION_ATTACHMENT : "uploaded"
    TRANSACTION_ATTACHMENT {
        uuid Id "also the file name on disk"
        uuid TransactionId "restricting foreign key"
        string FileName "sanitized, max 120, shown only"
        string ContentType "detected from the bytes, max 60"
        bigint SizeBytes "at most 10 MB"
        char Sha256 "64 lowercase hex characters"
        uuid UserId "who uploaded it"
        timestamptz CreatedAt "when it was uploaded"
        bool IsDeleted "in the trash"
    }
```

`TransactionAttachment` is an `OwnableEntity`, so the uploader column (`UserId`), its restricting foreign key to the user and the timestamps come from the base class, and `CreatedAt` is the upload time the API answers as `uploadedAt`. It is deliberately not owner-filtered: `AppDbContext` gives it its own query filter, `!IsDeleted && Transactions.Any(t => t.Id == a.TransactionId)`, and the transactions filter inside it is the account filter, which carries household membership and the `X-Active-Household` narrowing. So whoever can see the transaction sees its files, a household member sees a file another member uploaded, and a file of a deleted transaction or of an archived account is invisible with it. The index on (TransactionId, CreatedAt) serves the only read, a transaction's files oldest first; the count on the ledger page is one grouped query over the same index.

The bytes are not in the database. A row describes a file, and the file lives in the attachment directory under the row's id. Why a directory and not a `bytea` column is in the [decision log](../decisions/attachments.md).

## Storage

`App:AttachmentDirectory` names the directory: `/attachments` on the `attachments` named volume in `docker-compose.yml` (the production overlay inherits the mount, the end-to-end stack mounts its own `e2e_attachments`), `.local/attachments` in development through `scripts/dev-env.ps1`, and `attachments` under the content root when nothing is configured, which git and `.dockerignore` both exclude. The API image creates `/attachments` owned by the non-root `app` user, the same way it creates `/keys` and `/backups`, and `just verify-production` checks that only the `api` service mounts the volume.

A file is written as `<32 hex digits>` — the attachment id — and nothing else. The name the browser sent is never part of a path: it is sanitized for display and stored in the row, so `..\..\etc/passwd.pdf`, a name with control characters or a name of 400 characters cannot reach the file system at all. `AttachmentStore` writes an upload to `<random>.tmp` while hashing it, replaces an image there with its [cleaned copy](#location-and-other-metadata), renames it to the id once the row is about to be saved, and deletes it again when the save fails; a `.tmp` file, a file whose id no row knows, and a `.restore-*` staging folder left by a crash are swept by the purge job once they are more than an hour old, so a file another request is still writing is never touched.

## Uploading

```mermaid
flowchart TD
    Pick["drop files on the zone, or choose them"] --> Client{"client check:<br/>type, 10 MB, free slots"}
    Client -->|"refused"| Say["name the file and the reason, send nothing"]
    Client -->|"accepted"| Post["POST /api/transactions/{id}/attachments<br/>multipart, one file per request, in parallel"]
    Post --> Visible{"transaction visible?"}
    Visible -->|"no"| NotFound["404 resource.notFound"]
    Visible -->|"yes"| Declared{"declared type allowed,<br/>or unspecified?"}
    Declared -->|"no"| TypeRefused["400 attachment.typeNotAllowed"]
    Declared -->|"yes"| Stream["stream to id.tmp with SHA-256,<br/>stop past 10 MB"]
    Stream --> Sniff{"first 16 bytes:<br/>JPEG, PNG, WebP, HEIC or PDF?"}
    Sniff -->|"none"| Refuse["400 typeNotAllowed, or contentMismatch<br/>when a type was declared"]
    Sniff -->|"differs from declared"| Mismatch["400 attachment.contentMismatch"]
    Sniff -->|"PDF"| Lock["advisory lock on the transaction id,<br/>count again"]
    Sniff -->|"image"| Clean["decode, turn upright, drop metadata,<br/>encode again, hash again;<br/>HEIC becomes JPEG"]
    Clean -->|"cannot be decoded"| Mismatch
    Clean -->|"over 10 MB now"| Large["400 attachment.tooLarge"]
    Clean --> Lock
    Lock -->|"10 already"| Full["409 attachment.limitReached"]
    Lock -->|"room"| Save["rename tmp to id, insert the row,<br/>audit row if the account is shared, commit"]
    Save --> Answer["201 with the stored file"]
```

The type is decided by the file's first bytes, not by what the browser declared: `FF D8 FF` is JPEG, the eight-byte PNG signature is PNG, `RIFF….WEBP` is WebP, an ISO box `ftyp` with a HEIF brand (`heic`, `heix`, `mif1` and the rest) is HEIC, and `%PDF-` is PDF. The declared type only has to agree. `application/octet-stream` or no type at all counts as "not declared", which is what browsers send for HEIC photos, so those are judged by their bytes alone. Everything else — SVG, HTML, GIF, office documents, archives — is refused, because the only thing a receipt needs to be is a picture or a PDF, and every extra type is another way to smuggle script into a download. The stored name gets an extension that matches the detected type: `invoice.pdf` that turns out to be a PNG is kept as `invoice.pdf.png`, and a name that loses everything to sanitizing becomes `attachment.png`.

The limits are named constants on `TransactionAttachment`: `MaxFileBytes` (10 MB) and `MaxPerTransaction` (10). The endpoint sets `MaxRequestBodySize` to 10 MB plus 256 KB for the multipart envelope, so Kestrel refuses anything larger with 413 before the service is reached; a file between the two is refused by the service with `attachment.tooLarge` while it is being streamed, so a lying `Content-Length` does not help. Caddy sets no body limit on the `/api` route in either Caddyfile, so the application's limit is the only one. The count is checked once before the file is read, to fail early, and again under a transaction-scoped advisory lock keyed on the transaction id, so two uploads racing for the tenth slot cannot both get it. Since 2026-10-01 the upload is throttled to 30 calls per five minutes per client, the same budget as [reading a receipt](receipt-reading.md), and the 31st answers 429, because every image upload is decoded and encoded again on the server.

| Code | Status | When |
| --- | --- | --- |
| `required` | 400 | the request has no `file` field |
| `attachment.empty` | 400 | the file has no bytes |
| `attachment.tooLarge` | 400 | the file is larger than 10 MB (a request body over 10.25 MB is refused by Kestrel with 413 first), or an image is once it is encoded again |
| `attachment.typeNotAllowed` | 400 | the declared type, or the content when nothing was declared, is not JPEG, PNG, WebP, HEIC or PDF |
| `attachment.contentMismatch` | 400 | an allowed type was declared and the bytes are another type, or none; or an image whose bytes cannot be decoded |
| `attachment.limitReached` | 409 | the transaction already has 10 files; also answered by a restore from the trash that would make it 11 |
| `resource.notFound` | 404 | the transaction or the attachment is not visible to the caller, or the file is no longer on disk |

## Location and other metadata

A phone photo carries EXIF: the camera, the time and, unless the person turned it off, the GPS position where it was taken. A receipt photographed at home would store the home's coordinates in the attachment directory, in every backup and in the member's own export, and a household member who can see the transaction could download it. So an image is cleaned before it is kept, and the bytes the browser sent are never stored.

`AttachmentImage.WithoutMetadata` reads the file in memory as the format its first bytes named, under the same Magick.NET limits as [receipt reading](receipt-reading.md), set once for the process in the static constructor of `AttachmentImage`: 16000 pixels a side, 512 MB of memory, and since 2026-10-01 an area of 128 Mi pixels (about 512 MB at the four bytes a pixel of Magick.NET Q8), above which the pixel cache moves to disk, and 1 GB of that disk. An image wider or taller than the limit, or whose pixels need more than the memory and the disk together, fails to decode. No time limit is set: ImageMagick counts it from the first image the process ever decoded, not per image, and ends the whole process when it runs out, so on a server that runs for weeks it would stop the API rather than one slow file; the throttle and the 10 MB file size bound the work instead. It turns the pixels upright from the EXIF orientation, converts them to sRGB when the file carries a colour profile, strips every profile (EXIF with its GPS block, XMP, IPTC and ICC), the comment and the PNG text chunks, and encodes the image again in its own format: a JPEG at the quality ImageMagick estimates from the original, a PNG losslessly, a lossless WebP losslessly and a lossy one at the encoder's default quality. An animated image keeps its first frame. Magick.NET reads HEIC but cannot write it, so a HEIC photo is kept as a JPEG at quality 85 (`AttachmentImage.ConvertedHeicQuality`): its type becomes `image/jpeg` and its name's extension `.jpg`, so `IMG_0412.HEIC` is kept as `IMG_0412.jpg` and gets a thumbnail like any other JPEG. The cleaned bytes replace the temporary file, and their size and SHA-256 are what the row stores, the response answers and the ETag carries.

An image that cannot be decoded, such as the right first bytes followed by anything else or a side over 16000 pixels or more pixels than memory and disk allow, is refused with `attachment.contentMismatch`, because a file that cannot be read cannot be shown to be clean. An image that is larger than 10 MB once encoded again, which in practice only a large HEIC turned into JPEG is, is refused with `attachment.tooLarge`. A PDF is stored as sent: its metadata names the author and the program, not a place, and rewriting PDFs is out of scope.

Since the stored file is the cleaned one, the download, the [backup](#backups) and the [per-user export](data-export-per-user.md) carry no position. A restore writes back the bytes its backup holds, checked against their rows, so a backup taken before 2026-09-30 brings back files as they were uploaded. Files stored before that day are not rewritten; the [decision log](../decisions/attachments.md) says why.

## Downloading and thumbnails

`GET /api/attachments/{id}/content` streams the file with the detected content type and always as `Content-Disposition: attachment`, with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`. A browser that navigates to the address saves the file instead of rendering it, and even if it rendered it, the sandbox leaves it no script and no origin. Caddy adds the same `nosniff` and a `default-src 'none'` policy to every `/api` response in production. The ETag is the SHA-256, and a matching `If-None-Match` answers 304 after the same visibility check, so a thumbnail that is shown again costs a round trip and no bytes; `Cache-Control: private, no-cache` keeps a shared cache from holding it and makes the browser ask every time, which is what makes losing access take effect at once.

Thumbnails are the same address in an `<img>` element. An image element ignores `Content-Disposition` and the page's own policy allows `img-src 'self'`, so no separate inline route and no blob URLs are needed, and a PDF, or a HEIC file stored before HEIC photos were kept as JPEG, which a browser cannot draw as an image, gets an icon instead. The `<img>` request carries the session cookie but not the active-household header, which only means the server checks it against everything the user may see, never more.

## Removing, the trash and the purge

```mermaid
stateDiagram-v2
    [*] --> Live: upload
    Live --> Trashed: removed
    Trashed --> Live: Undo or Restore within 30 days
    Live --> WithTransaction: the transaction is deleted
    WithTransaction --> Live: the transaction is restored within 30 days
    Trashed --> Purged: older than 30 days
    WithTransaction --> Purged: transaction deleted over 30 days ago
    Purged --> [*]: row and file removed by RetentionJob
```

Removing a file is a soft delete written with `IDeletionRecorder` as kind `attachment`, described as `receipt.pdf, Maxima, 42.18 EUR`, and the file stays on disk. The toast offers Undo and the trash lists it for 30 days, like every other delete. A restore is refused with `restore.referenceMissing` while the transaction itself is deleted or invisible (restore the transaction first), with `attachment.limitReached` when ten other files were added in the meantime, and with `restore.detailsLost` when the file is no longer on disk.

Deleting a transaction does not touch its files. They are hidden because their transaction is, and restoring the transaction brings them back with it, with no entry of their own in the trash. The same is true of archiving an account.

The attachment steps of `RetentionJob`, a separate `AttachmentPurgeJob` until 2026-09-29, run daily and were the first code that hard-deletes something a person put into the ledger. It hard-deletes the rows, and then the files, of attachments removed more than 30 days ago (`DeletionEntry.RetentionDays`) and of attachments whose transaction was deleted more than 30 days ago, and it removes files that no row refers to once they are an hour old. A trash entry whose attachment was purged answers `restore.expired`, which is what it would have answered anyway.

Its last step deletes [receipt readings](receipt-reading.md#retention) older than 24 hours that failed or are still pending, and those whose SHA-256 no attachment row carries any more, trashed ones included, so a reading of a file lives exactly as long as the file and survives a delete that is undone. Reading a receipt changes nothing about the attachment itself: a household member who can see a file can read it and gets a reading of their own.

It still owns the files on disk, so attachments are the one trash kind `RetentionJob` leaves alone. The one place the two meet is a transaction old enough to be purged: `RetentionJob` deletes that transaction's attachment rows and their files itself, in the same step and by the same rule, because the restricting foreign key from the attachment would otherwise refuse the delete and neither job may depend on having run first. Both are idempotent, so whichever runs first leaves nothing for the other. See [Trash and undo](trash-and-undo.md) and [Background jobs](background-jobs.md).

## Audit

On a shared account, adding, removing and restoring a file writes an activity row in the household of the account, with the entity kind `attachment`, the attachment id and the description `receipt.png, Rimi, 9.99 EUR`; the page reads it as "Šarūnas attached …", "removed the file …" and "restored the file …". Personal accounts write nothing. The row comes from the same change-tracker collector as every other row, which looks up the transaction behind each tracked attachment to find the account and its household. See [Audit log](audit-log.md).

## Backups

```mermaid
flowchart LR
    Take["POST /api/backups"] --> Zip["id.zip"]
    Zip --> Doc["backup.json<br/>deflated, the same document as before"]
    Zip --> Files["attachments/32-hex-id<br/>stored uncompressed, one entry per row"]
    Restore["restore"] --> Rows["tables into the database,<br/>transaction still open"]
    Rows --> Stage["read id and Sha256 of every attachment row,<br/>copy each entry to a staging folder, hash it"]
    Stage -->|"a hash differs"| Rollback["rollback, backup.invalidFile"]
    Stage -->|"all match"| Commit["commit, then move staged files into place"]
```

A backup is now a zip archive: `backup.json`, the unchanged JSON document with every table, and one entry `attachments/<id>` per attachment row whose file exists, soft-deleted ones included, because a restored trash must be able to bring them back. The document is deflated; the files are stored without compression, because JPEG, WebP, HEIC and most PDFs are compressed already and deflating them again costs time for nothing. A file missing from the directory when the backup is taken is logged and left out.

Restore reads the document into the open restore transaction exactly as before, then reads the id and SHA-256 of every restored attachment row inside that transaction and copies the matching archive entry into a `.restore-*` folder, hashing it as it goes. A hash that does not match the row rolls the whole restore back with `backup.invalidFile`; the checksum is taken from the restored rows, not from the archive, so a tampered file cannot vouch for itself. After the commit the staged files are moved over the attachment directory. An attachment row without an entry is restored all the same and logged; its download answers 404 until the file is put back. Files that belonged to rows the restore removed stay until the purge job's orphan sweep an hour later. The response and the log count the files written back.

The old formats still work. `BackupStore` names an archive `<id>.zip` and a legacy backup `<id>.json.gz`, finds either, and tells them apart by the first bytes; upload accepts a zip archive, gzip-compressed JSON or plain JSON. A backup taken before this migration is still listed and downloadable, and, as before, its migration differs from the running application, so a restore answers `backup.schemaMismatch` and the way back is the application version that wrote it. The archive entries are checked on upload: anything other than `backup.json` and `attachments/<32 hex>` entries no larger than an attachment can be is refused as `backup.invalidFile`, so a crafted path such as `../outside.txt` is never read, let alone written.

Size: a backup grows by the size of the attachment directory, since the files are copied as they are. A thousand phone photos of receipts at 2–3 MB each add 2–3 GB. The decompressed-size guard, `App:BackupMaxDecompressedBytes` (1 GiB), applies to `backup.json` only; each file is bounded by the 10 MB attachment limit instead. Uploading a downloaded backup is therefore capped at 2 GB rather than 100 MB, with the multipart form limit raised to match; a larger archive has to be copied into the backup directory together with an info file by hand. Downloading streams the stored file. See [Backup and restore](backup-and-restore.md).

## The screen

The edit dialog of a transaction shows "Receipts and files" under its form. Files save as soon as they are chosen or dropped, independently of the form's Save button; the create dialog has no such section, because there is nothing to attach them to until the transaction exists. Each row shows a thumbnail for JPEG, PNG and WebP, which includes every HEIC photo uploaded since it is kept as JPEG, and an icon for PDF and an older HEIC file, the name, the size, who uploaded it and when, a download link and a remove button, all named after the file. Below the list is one drop zone that is also the file picker: the file input covers the zone, so dropping files on it and clicking it are the same native control, keyboard focus shows on the zone, and no drag handlers sit on a non-interactive element. The zone is disabled while uploads run and once ten files are attached.

Before anything is sent, the client refuses what the server would refuse anyway — a type outside the list, a file over 10 MB, more files than there are free slots — and names each file with its reason. Accepted files are uploaded in parallel, one request each, with "Uploading 2 files…" as a status line; a server refusal shows its translated sentence under the zone and the other files still go through. Removing a file shows the undo toast. The ledger table and the phone list show a paperclip and the count next to the description of any transaction that has files, with "2 files attached" as its accessible name.

The CSV and PDF exports do not gain an attachment column. A count says nothing a reader of the export can act on, and adding a column would change a CSV layout that spreadsheets are already built on.

## Tests

`AttachmentEndpointTests` covers the round trip with its headers and the SHA-256 and size of the stored bytes, a sideways JPEG, PNG and WebP carrying EXIF GPS coordinates, XMP, IPTC and a comment coming back upright with no profile, no comment and no trace of the place name, the 304 on a matching ETag, the name losing its path and getting the right extension while the file is stored under its id, refusal of text, HTML and GIF with `attachment.typeNotAllowed`, of a script declared as PNG, a PNG declared as PDF and a PNG signature followed by bytes that do not decode with `attachment.contentMismatch`, of an empty, a missing and an 11 MB file, the eleventh file, the trash round trip with the file still on disk, a deleted transaction hiding and restoring its files, a file that cannot come back while its transaction is deleted, a stranger's 404 on every operation, household members sharing the files of a shared account and losing them under another active household, the three audit rows on a shared account and none on a personal one, and the purge job removing an expired file, a file of a long-deleted transaction and an old orphan while keeping a fresh orphan and the files still in their window. `BackupEndpointTests` restores an archive and downloads the restored file byte for byte, checks the archive layout, rolls back a restore whose file was replaced, and refuses an archive with an unexpected entry.

`ReceiptReadingTests` checks that a file read before it is attached is answered from the cache when the attachment is read. No test covers a HEIC upload: Magick.NET cannot write HEIC, so the repository has no HEIC fixture to send. The frontend has stories for the list, documents and photos, both locales, empty, full, loading, failure, an upload with a removal and its undo, an upload in progress and refused files, a play on the edit dialog and on the ledger's paperclip, and DOM and unit tests of the list, the client checks and the drop zone.

## Warranty dates

Since 2026-09-30 an attachment can carry `WarrantyUntil`, the last day the purchase on that receipt is under warranty. Each file in the transaction dialog has "Warranty until" with a date picker whose Clear removes it; `PUT /api/attachments/{id}/warranty` takes `{ warrantyUntil }` (a date or null), answers the attachment, and is refused with 404 for a file the caller cannot see. The attachment responses answer the date. `WarrantyReminderJob` runs every six hours, whatever the feature switches, and raises one `warrantyExpiring` notification for every attachment, of a transaction not deleted, whose warranty ends in the next 30 days: to the member who attached the file, titled with the transaction's description or the file name, reading "Warranty ends Oct 12, 2026" and linking to the ledger. It deduplicates per attachment and date under `AppLock.WarrantyReminders`, so changing the date raises a new reminder and a second pass says nothing. The column travels in backups like the rest of the row.
