using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.UpdateUserRole;

public sealed class UpdateUserRoleValidator : Validator<UpdateUserRoleRequest>
{
    public UpdateUserRoleValidator()
    {
        RuleFor(r => r.Role).IsAppRole();
    }
}
