using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.Shared;

public abstract class HouseholdInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IHouseholdInput
{
    protected HouseholdInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
    }
}
