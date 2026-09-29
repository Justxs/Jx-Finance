using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed class GetCashFlowForecastValidator : Validator<GetCashFlowForecastRequest>
{
    public GetCashFlowForecastValidator()
    {
        RuleFor(r => r.Days).IsWithin(30, 90);
    }
}
