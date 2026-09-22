using FastEndpoints;
using JxFinance.Common.Sharing;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Tags.Shared;

public abstract class TagInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ITagInput
{
    public const int NameMaxLength = 50;

    protected TagInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(NameMaxLength);
        RuleFor(r => r.HouseholdId).RequiresHouseholdWhenShared("tag");
    }
}
