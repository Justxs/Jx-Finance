using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Currencies.GetExchangeRate;

public sealed class GetExchangeRateRequest
{
    public Currency From { get; init; }

    public Currency To { get; init; }

    public DateOnly? Date { get; init; }
}
