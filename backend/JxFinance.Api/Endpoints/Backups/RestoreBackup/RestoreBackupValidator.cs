using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed class RestoreBackupValidator : Validator<RestoreBackupRequest>
{
    public RestoreBackupValidator()
    {
        RuleFor(r => r.Password).IsRequired().HasMaxLength(100);
    }
}
