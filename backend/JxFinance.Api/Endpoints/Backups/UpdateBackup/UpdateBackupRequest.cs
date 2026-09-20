using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.UpdateBackup;

public sealed record UpdateBackupRequest(Guid Id, string? Note) : IBackupInput;
