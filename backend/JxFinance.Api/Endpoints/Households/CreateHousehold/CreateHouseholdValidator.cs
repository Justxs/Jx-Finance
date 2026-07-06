using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed class CreateHouseholdValidator : Validator<CreateHouseholdRequest>
{
    public CreateHouseholdValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
    }
}
