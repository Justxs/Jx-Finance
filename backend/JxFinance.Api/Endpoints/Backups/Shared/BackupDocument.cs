namespace JxFinance.Endpoints.Backups.Shared;

public sealed record BackupDocument(
    string? Format,
    int Version,
    DateTimeOffset CreatedAt,
    string? Migration,
    IReadOnlyList<BackupTable>? Tables);

public sealed record BackupTable(
    string? Name,
    IReadOnlyList<string>? Columns,
    IReadOnlyList<IReadOnlyList<string?>>? Rows);
