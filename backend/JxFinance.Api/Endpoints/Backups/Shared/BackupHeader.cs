namespace JxFinance.Endpoints.Backups.Shared;

public sealed record BackupHeader(string? Format, int Version, DateTimeOffset CreatedAt, string? Migration)
{
    public Guid? UserId { get; init; }

    public int MissingAttachments { get; init; }
}
