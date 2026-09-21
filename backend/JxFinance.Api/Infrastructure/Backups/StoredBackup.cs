using System.Text.Json.Serialization;

namespace JxFinance.Infrastructure.Backups;

public sealed record StoredBackup(
    Guid Id,
    DateTimeOffset CreatedAt,
    string? Note,
    string Migration,
    int Tables,
    long Rows,
    bool Uploaded)
{
    public long SizeBytes { get; init; }

    public int Attachments { get; init; }

    [JsonIgnore]
    public bool IsArchive { get; init; }
}
