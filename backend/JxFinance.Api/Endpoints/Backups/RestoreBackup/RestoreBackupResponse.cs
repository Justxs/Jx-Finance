namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed record RestoreBackupResponse(DateTimeOffset CreatedAt, int Tables, long Rows, int Attachments);
