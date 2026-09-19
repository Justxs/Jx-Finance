namespace JxFinance.Endpoints.Backups.UploadBackup;

public sealed class UploadBackupRequest
{
    public IFormFile File { get; set; } = default!;

    public string? Note { get; set; }
}
