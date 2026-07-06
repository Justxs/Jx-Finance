using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed record CreateDebtRequest(
    string Name,
    DebtType Type,
    string OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf);
