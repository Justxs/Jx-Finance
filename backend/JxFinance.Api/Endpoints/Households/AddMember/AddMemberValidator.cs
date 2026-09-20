using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.AddMember;

public sealed class AddMemberValidator : Validator<AddMemberRequest>
{
    public AddMemberValidator()
    {
        RuleFor(r => r.Email).IsRequired().HasMaxLength(256).IsEmail();
        RuleFor(r => r.Role).IsKnownEnum();
    }
}
