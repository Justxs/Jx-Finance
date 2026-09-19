using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record SecurityResponse(
    Guid Id,
    string Symbol,
    string Name,
    string? Isin,
    string? Exchange,
    SecurityType Type,
    Currency Currency,
    [property: Quantity] decimal? LastPrice,
    DateOnly? LastPriceDate);
