using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.UpdateUserRole;

public sealed class UpdateUserRoleValidator : Validator<UpdateUserRoleRequest>
{
    public UpdateUserRoleValidator()
    {
        RuleFor(r => r.Role).Must(r => r is AppRoles.Admin or AppRoles.Member)
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage($"Role must be '{AppRoles.Admin}' or '{AppRoles.Member}'.");
    }
}
