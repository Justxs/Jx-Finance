using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginValidator : Validator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress();
        RuleFor(r => r.Password).NotEmpty();
    }
}
