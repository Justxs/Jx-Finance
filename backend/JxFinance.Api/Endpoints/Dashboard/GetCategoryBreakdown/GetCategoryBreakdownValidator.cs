using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Dashboard.GetCategoryBreakdown;

public sealed class GetCategoryBreakdownValidator : Validator<GetCategoryBreakdownRequest>
{
    public GetCategoryBreakdownValidator()
    {
        RuleFor(r => r.Month).IsMonth();
    }
}
