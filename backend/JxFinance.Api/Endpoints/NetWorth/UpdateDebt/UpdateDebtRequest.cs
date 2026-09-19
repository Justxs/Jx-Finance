using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed record UpdateDebtRequest(
    Guid Id,
    string Name,
    DebtType Type,
    [property: Money(NotNull = true)] decimal? OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf);
