using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Households.UpdateHousehold;

public sealed class UpdateHouseholdValidator : Validator<UpdateHouseholdRequest>
{
    public UpdateHouseholdValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
    }
}
