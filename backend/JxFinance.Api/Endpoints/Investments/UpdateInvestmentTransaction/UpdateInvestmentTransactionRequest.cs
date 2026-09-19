using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.UpdateInvestmentTransaction;

public sealed record UpdateInvestmentTransactionRequest(
    Guid Id,
    Guid AccountId,
    InvestmentTransactionType Type,
    DateOnly Date,
    Guid? SecurityId = null,
    [property: Quantity] decimal? Quantity = null,
    [property: Quantity] decimal? Price = null,
    [property: Money] decimal? Amount = null,
    [property: Money] decimal? Fee = null,
    Currency? Currency = null,
    string? Description = null) : IInvestmentTransactionInput;
