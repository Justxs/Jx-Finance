using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.CreateBackup;

public sealed class CreateBackupValidator : Validator<CreateBackupRequest>
{
    public CreateBackupValidator()
    {
        RuleFor(r => r.Note).HasMaxLength(BackupNote.MaxLength);
    }
}
