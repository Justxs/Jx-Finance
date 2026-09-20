using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.ResetUserPassword;

public sealed class ResetUserPasswordValidator : Validator<ResetUserPasswordRequest>
{
    public ResetUserPasswordValidator()
    {
        RuleFor(r => r.NewPassword).IsRequired().HasMinLength(8).HasMaxLength(100);
        RuleFor(r => r.CurrentPassword).IsRequired().HasMaxLength(100);
    }
}
