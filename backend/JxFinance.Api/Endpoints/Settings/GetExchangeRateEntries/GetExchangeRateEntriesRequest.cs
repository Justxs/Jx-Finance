using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Settings.GetExchangeRateEntries;

public sealed class GetExchangeRateEntriesRequest
{
    public Currency Currency { get; init; }
}
