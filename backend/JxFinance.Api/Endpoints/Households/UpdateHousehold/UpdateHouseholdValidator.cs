using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.UpdateHousehold;

public sealed class UpdateHouseholdValidator : Validator<UpdateHouseholdRequest>
{
    public UpdateHouseholdValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
    }
}
