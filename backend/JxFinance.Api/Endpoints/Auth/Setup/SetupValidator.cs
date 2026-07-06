using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupValidator : Validator<SetupRequest>
{
    public SetupValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(r => r.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
        RuleFor(r => r.DisplayName).NotEmpty().MaximumLength(100);
    }
}
