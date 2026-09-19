namespace JxFinance.Endpoints.Backups.Shared;

public sealed record BackupResponse(
    Guid Id,
    DateTimeOffset CreatedAt,
    string? Note,
    long SizeBytes,
    int Tables,
    long Rows,
    bool Uploaded,
    bool Restorable);
