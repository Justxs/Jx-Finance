using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupValidator : Validator<SetupRequest>
{
    public SetupValidator()
    {
        RuleFor(r => r.Email).IsRequired().IsEmail().HasMaxLength(256);
        RuleFor(r => r.Password).IsNewPassword();
        RuleFor(r => r.DisplayName).IsRequired().HasMaxLength(100);
    }
}
