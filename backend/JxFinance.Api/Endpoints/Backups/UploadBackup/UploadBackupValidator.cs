using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.UploadBackup;

public sealed class UploadBackupValidator : Validator<UploadBackupRequest>
{
    public UploadBackupValidator()
    {
        RuleFor(r => r.Note).HasMaxLength(BackupNote.MaxLength);
    }
}
