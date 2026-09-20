using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.CreateBackup;

public sealed record CreateBackupRequest(string? Note) : IBackupInput;
