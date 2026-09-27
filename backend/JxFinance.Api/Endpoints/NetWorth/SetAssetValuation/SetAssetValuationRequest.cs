using JxFinance.Common.Json;

namespace JxFinance.Endpoints.NetWorth.SetAssetValuation;

public sealed record SetAssetValuationRequest(
    Guid Id,
    DateOnly Date,
    [property: Money(NotNull = true)] decimal? Value,
    string? Note = null);
