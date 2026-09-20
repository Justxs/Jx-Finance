using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Investments.SetSecurityPrice;

public sealed record SetSecurityPriceRequest(
    Guid Id,
    [property: Quantity] decimal? LastPrice,
    DateOnly? LastPriceDate = null);
