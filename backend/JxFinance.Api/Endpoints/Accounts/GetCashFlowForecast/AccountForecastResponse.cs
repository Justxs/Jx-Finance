using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed record AccountForecastResponse(
    Guid AccountId,
    string AccountName,
    Currency Currency,
    [property: Money] decimal StartBalance,
    [property: Money] decimal? UsualDailySpending,
    [property: Money] decimal LowestBalance,
    DateOnly LowestOn,
    DateOnly? BelowZeroOn,
    DateOnly? BelowZeroWithSpendingOn,
    bool OtherCurrencies,
    IReadOnlyList<ForecastEntryResponse> Entries);
