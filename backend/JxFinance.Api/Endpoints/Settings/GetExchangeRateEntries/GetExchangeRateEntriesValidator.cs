using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Settings.GetExchangeRateEntries;

public sealed class GetExchangeRateEntriesValidator : Validator<GetExchangeRateEntriesRequest>
{
    public GetExchangeRateEntriesValidator()
    {
        RuleFor(r => r.Currency).IsKnownEnum();
    }
}
