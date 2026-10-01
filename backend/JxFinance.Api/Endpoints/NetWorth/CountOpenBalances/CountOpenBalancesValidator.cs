using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.CountOpenBalances;

public sealed class CountOpenBalancesValidator : Validator<CountOpenBalancesRequest>
{
    public CountOpenBalancesValidator()
    {
        RuleFor(r => r.Count).IsPresent();
    }
}
