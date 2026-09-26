using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Auth.ResetPassword;

public sealed class ResetPasswordValidator : Validator<ResetPasswordRequest>
{
    public ResetPasswordValidator()
    {
        RuleFor(r => r.Email).IsEmailAddress();
        RuleFor(r => r.Token).IsRequired().HasMaxLength(1000);
        RuleFor(r => r.NewPassword).IsNewPassword();
    }
}
