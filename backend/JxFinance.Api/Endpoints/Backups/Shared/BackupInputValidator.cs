using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Backups.Shared;

public abstract class BackupInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IBackupInput
{
    protected BackupInputValidator()
    {
        RuleFor(r => r.Note).HasMaxLength(BackupNote.MaxLength);
    }
}
