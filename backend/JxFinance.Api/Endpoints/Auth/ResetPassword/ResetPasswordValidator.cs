using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Auth.ResetPassword;

public sealed class ResetPasswordValidator : Validator<ResetPasswordRequest>
{
    public ResetPasswordValidator()
    {
        RuleFor(r => r.Email).IsRequired().IsEmail().HasMaxLength(320);
        RuleFor(r => r.Token).IsRequired().HasMaxLength(1000);
        RuleFor(r => r.NewPassword).IsRequired().HasMinLength(8).HasMaxLength(100);
    }
}
