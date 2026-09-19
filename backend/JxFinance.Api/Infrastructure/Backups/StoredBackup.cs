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
}
