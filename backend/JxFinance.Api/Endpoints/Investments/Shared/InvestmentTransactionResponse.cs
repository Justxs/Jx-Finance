using JxFinance.Common.Json;
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
    [property: Quantity] decimal Quantity,
    [property: Quantity] decimal Price,
    [property: Money] decimal Fee,
    [property: Money] decimal CashAmount,
    Currency Currency,
    string? Description,
    InvestmentSource Source,
    DateTimeOffset CreatedAt);
