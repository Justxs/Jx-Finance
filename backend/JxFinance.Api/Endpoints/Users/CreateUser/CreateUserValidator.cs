using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserValidator : Validator<CreateUserRequest>
{
    public CreateUserValidator()
    {
        RuleFor(r => r.Email).IsRequired().IsEmail().HasMaxLength(256);
        RuleFor(r => r.DisplayName).IsRequired().HasMaxLength(100);
        RuleFor(r => r.Password).IsRequired().HasMinLength(8).HasMaxLength(100);
        RuleFor(r => r.Role).Must(r => r is AppRoles.Admin or AppRoles.Member)
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage($"Role must be '{AppRoles.Admin}' or '{AppRoles.Member}'.");
    }
}
