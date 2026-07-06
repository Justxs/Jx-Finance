using FastEndpoints;
using FluentValidation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserValidator : Validator<CreateUserRequest>
{
    public CreateUserValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(r => r.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
        RuleFor(r => r.Role).Must(r => r is AppRoles.Admin or AppRoles.Member)
            .WithMessage($"Role must be '{AppRoles.Admin}' or '{AppRoles.Member}'.");
    }
}
