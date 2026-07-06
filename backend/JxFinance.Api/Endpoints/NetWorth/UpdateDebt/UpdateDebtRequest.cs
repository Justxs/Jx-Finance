using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed record UpdateDebtRequest(
    Guid Id,
    string Name,
    DebtType Type,
    string OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf);
