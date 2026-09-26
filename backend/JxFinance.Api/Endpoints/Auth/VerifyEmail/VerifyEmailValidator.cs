using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Auth.VerifyEmail;

public sealed class VerifyEmailValidator : Validator<VerifyEmailRequest>
{
    public VerifyEmailValidator()
    {
        RuleFor(r => r.Email).IsEmailAddress();
        RuleFor(r => r.Token).IsRequired().HasMaxLength(1000);
    }
}
