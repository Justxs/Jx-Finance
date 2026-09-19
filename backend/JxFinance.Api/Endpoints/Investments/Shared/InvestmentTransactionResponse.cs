using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record InvestmentTransactionResponse(
    Guid Id,
    Guid AccountId,
    Guid? SecurityId,
    string? Symbol,
    InvestmentTransactionType Type,
    DateOnly Date,
    string Quantity,
    string Price,
    string Fee,
    string CashAmount,
    Currency Currency,
    string? Description,
    InvestmentSource Source,
    DateTimeOffset CreatedAt);
