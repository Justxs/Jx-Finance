using System.IO.Compression;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.Services;

public enum BackupContainer
{
    Json,
    Gzip,
    Zip,
}

public static class BackupArchive
{
    public const string DocumentEntry = "backup.json";
    public const string AttachmentFolder = "attachments/";

    public static string AttachmentEntry(Guid id) => $"{AttachmentFolder}{id:N}";

    public static async Task<BackupContainer> DetectAsync(Stream input, CancellationToken cancellationToken)
    {
        var magic = new byte[4];
        var read = await input.ReadAtLeastAsync(magic, magic.Length, throwOnEndOfStream: false, cancellationToken);
        input.Position = 0;
        return (read, magic) switch
        {
            (4, [0x50, 0x4B, 0x03, 0x04]) => BackupContainer.Zip,
            ( >= 2, [0x1f, 0x8b, ..]) => BackupContainer.Gzip,
            _ => BackupContainer.Json,
        };
    }

    public static ZipArchiveEntry Document(ZipArchive archive)
    {
        var document = default(ZipArchiveEntry);
        foreach (var entry in archive.Entries)
        {
            if (entry.FullName == DocumentEntry && document is null)
            {
                document = entry;
            }
            else if (!IsAttachment(entry))
            {
                throw new BackupFileException();
            }
        }

        return document ?? throw new BackupFileException();
    }

    public static int CountAttachments(ZipArchive archive) => archive.Entries.Count(IsAttachment);

    private static bool IsAttachment(ZipArchiveEntry entry) =>
        entry.FullName.StartsWith(AttachmentFolder, StringComparison.Ordinal)
        && Guid.TryParseExact(entry.FullName[AttachmentFolder.Length..], "N", out _)
        && entry.Length <= TransactionAttachment.MaxFileBytes;
}
