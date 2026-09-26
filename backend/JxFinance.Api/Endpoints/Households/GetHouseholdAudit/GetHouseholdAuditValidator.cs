using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Households.GetHouseholdAudit;

public sealed class GetHouseholdAuditValidator : Validator<GetHouseholdAuditRequest>
{
    public GetHouseholdAuditValidator()
    {
        RuleFor(r => r.Kind).IsKnownEnum();
        RuleFor(r => r.DateFrom).IsNotAfter(r => r.DateTo);
    }
}
