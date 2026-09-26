using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserValidator : Validator<CreateUserRequest>
{
    public CreateUserValidator()
    {
        RuleFor(r => r.Email).IsEmailAddress();
        RuleFor(r => r.DisplayName).IsRequired().HasMaxLength(100);
        RuleFor(r => r.Password).IsNewPassword();
        RuleFor(r => r.Role).IsAppRole();
    }
}
