using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginValidator : Validator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(r => r.Email).IsEmailAddress();
        RuleFor(r => r.Password).IsRequired();
    }
}
