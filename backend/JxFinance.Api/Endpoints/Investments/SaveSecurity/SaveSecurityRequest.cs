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
    string? LastPrice = null,
    DateOnly? LastPriceDate = null)
{
    public Guid Id { get; init; }
}
