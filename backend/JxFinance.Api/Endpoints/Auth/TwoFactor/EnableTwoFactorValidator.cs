using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorValidator : Validator<EnableTwoFactorRequest>
{
    public EnableTwoFactorValidator()
    {
        RuleFor(r => r.Code).NotEmpty();
    }
}
