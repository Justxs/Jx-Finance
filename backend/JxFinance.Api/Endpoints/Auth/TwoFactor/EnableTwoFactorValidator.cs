using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorValidator : Validator<EnableTwoFactorRequest>
{
    public EnableTwoFactorValidator()
    {
        RuleFor(r => r.Code).IsRequired();
    }
}
