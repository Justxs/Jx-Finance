using JxFinance.Common.Json;

namespace JxFinance.Endpoints.NetWorth.SetDebtBalance;

public sealed record SetDebtBalanceRequest(
    Guid Id,
    DateOnly Date,
    [property: Money(NotNull = true)] decimal? Amount,
    string? Note = null);
