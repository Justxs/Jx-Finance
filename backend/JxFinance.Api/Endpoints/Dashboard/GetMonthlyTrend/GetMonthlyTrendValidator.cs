using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendValidator : Validator<GetMonthlyTrendRequest>
{
    public GetMonthlyTrendValidator()
    {
        RuleFor(r => r.Month).IsMonth();
    }
}
