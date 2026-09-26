using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.ResetUserPassword;

public sealed class ResetUserPasswordValidator : Validator<ResetUserPasswordRequest>
{
    public ResetUserPasswordValidator()
    {
        RuleFor(r => r.NewPassword).IsNewPassword();
        RuleFor(r => r.CurrentPassword).IsRequired().HasMaxLength(100);
    }
}
