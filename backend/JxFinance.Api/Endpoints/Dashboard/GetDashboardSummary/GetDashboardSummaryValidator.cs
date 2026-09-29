using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryValidator : Validator<GetDashboardSummaryRequest>
{
    public GetDashboardSummaryValidator()
    {
        RuleFor(r => r.Month).IsMonth();
    }
}
