using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed class CreateHouseholdValidator : Validator<CreateHouseholdRequest>
{
    public CreateHouseholdValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
    }
}
