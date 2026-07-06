using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth;

public sealed record DebtResponse(
    Guid Id,
    string Name,
    DebtType Type,
    string OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf);
