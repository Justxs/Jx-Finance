using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.UploadBackup;

public sealed class UploadBackupRequest : IBackupInput
{
    public IFormFile File { get; set; } = default!;

    public string? Note { get; set; }
}
