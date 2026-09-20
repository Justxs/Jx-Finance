using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.UpdateMemberRole;

public sealed class UpdateMemberRoleValidator : Validator<UpdateMemberRoleRequest>
{
    public UpdateMemberRoleValidator()
    {
        RuleFor(r => r.Role).IsKnownEnum();
    }
}
