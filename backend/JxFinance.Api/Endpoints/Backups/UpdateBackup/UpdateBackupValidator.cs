using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.UpdateBackup;

public sealed class UpdateBackupValidator : Validator<UpdateBackupRequest>
{
    public UpdateBackupValidator()
    {
        RuleFor(r => r.Note).HasMaxLength(BackupNote.MaxLength);
    }
}
