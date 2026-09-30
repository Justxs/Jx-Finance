# Backup and restore: decisions

Related: feature page [Backup and restore](../features/backup-and-restore.md); architecture [Backup and restore](../architecture/backup-and-restore.md).

## Current

Reintroduced on 2026-09-19 as administrator-managed backups of the whole installation: taken on demand, kept in a server directory, listed with date, size and note, downloadable, uploadable, restorable and deletable. Written through the application as JSON rather than `pg_dump`, so the API image still needs no PostgreSQL client tools. Chosen over a per-user export (cannot carry households and shared records). The list lives in files beside the backups, not in a table, because a restore replaces every table and would otherwise replace the list with the one inside the backup. Still no scheduler and no offsite copy: that is the design removed on 2026-09-05. Restore replaces everything instead of merging, because merging by id has no sound answer for unique indexes and soft-deleted rows

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-29.** Backups written before attachments (a gzip-compressed `backup.json`) and plain JSON uploads stay readable, and a member export keeps `userId` and `missingAttachments` in its file but `BackupHeader` no longer carries them
  - Rejected: Dropping the gzip and plain JSON paths now that every new backup is a zip archive; keeping both export properties on the header for a future importer
  - Why: An administrator may still hold older backups, and reading them costs one branch on the file's first bytes. Only a test read the two export properties from the header, so the reader accepts and skips them; an importer can add them back when it needs them
- **2026-09-21.** A backup is a zip archive holding `backup.json`, deflated, and each attached file as an uncompressed entry `attachments/<id>`; restore checks every file's SHA-256 against its restored row before the commit and moves the files in after it. Old `.json.gz` backups stay readable
  - Rejected: The files as base64 strings inside the JSON, with a size cap; a separate archive of the attachment directory beside the JSON backup
  - Why: Base64 in the JSON costs a third more before compression, makes the 1 GiB decompressed-size guard either refuse an ordinary household's receipts or stop guarding anything, and turns every file into a token the streaming reader has to buffer. A second archive would be a backup in two halves that can be restored out of step. In a zip the JSON is the same document as before, so the reader, the inspector and the restorer are untouched; the guard stays on the JSON; each file is bounded by the attachment limit instead; and an administrator can open the archive and find a receipt by hand. The format is detected from the first bytes, so both old and new files upload, list and download
- **2026-09-19.** Backups are read as a stream with a hard cap on decompressed bytes (`App:BackupMaxDecompressedBytes`, 1 GiB)
  - Rejected: Deserializing the whole document with only a byte cap; a lower cap and no streaming
  - Why: A capped document of 1 GiB still needs several GiB as objects; streaming keeps memory flat, at the price of a strict property order in the file
- **2026-09-19.** Restore requires the administrator's current password and answers a wrong one with 400 `password.incorrect`
  - Rejected: 401 `credentials.invalid` like the 2FA confirmations
  - Why: The frontend client refreshes and retries once on 401, which would send the wrong password twice and count two failures toward the lockout
- **2026-09-19.** Development backups go to `.local/backups`, set by the dev scripts through `App__BackupDirectory`
  - Rejected: Leaving them in `backend/JxFinance.Api/backups`
  - Why: That directory sits inside the API project, which the Dockerfile copies whole and the Web SDK publishes from; `.local` is already outside git and the build context
