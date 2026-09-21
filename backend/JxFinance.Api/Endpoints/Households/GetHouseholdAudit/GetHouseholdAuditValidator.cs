using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.GetHouseholdAudit;

public sealed class GetHouseholdAuditValidator : Validator<GetHouseholdAuditRequest>
{
    public GetHouseholdAuditValidator()
    {
        RuleFor(r => r.Kind).IsKnownEnum();
        RuleFor(r => r.DateFrom)
            .Must((request, from) => from is null || request.DateTo is null || from <= request.DateTo)
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage("The start of the range must not be after its end.");
    }
}
