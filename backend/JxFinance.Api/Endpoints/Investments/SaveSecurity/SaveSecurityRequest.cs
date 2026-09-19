using FastEndpoints;
using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed record SaveSecurityRequest(
    string Symbol,
    string Name,
    SecurityType Type,
    Currency Currency,
    string? Isin = null,
    string? Exchange = null,
    [property: Quantity] decimal? LastPrice = null,
    DateOnly? LastPriceDate = null)
{
    [RouteParam, HideFromDocs]
    public Guid Id { get; init; }
}
