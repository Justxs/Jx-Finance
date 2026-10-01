using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Settings.SetExchangeRate;

public sealed record SetExchangeRateRequest(
    Currency Currency,
    DateOnly Date,
    [property: Quantity] decimal? Rate);
