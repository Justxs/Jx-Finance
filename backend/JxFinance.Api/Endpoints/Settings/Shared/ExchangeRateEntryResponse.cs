using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Endpoints.Settings.Shared;

public sealed record ExchangeRateEntryResponse(
    DateOnly Date,
    Currency Currency,
    [property: Quantity] decimal Rate,
    ExchangeRateSource Source,
    [property: Quantity] decimal? SyncedRate);
