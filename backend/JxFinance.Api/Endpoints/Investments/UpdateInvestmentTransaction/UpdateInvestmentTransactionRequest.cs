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
    string? Quantity = null,
    string? Price = null,
    string? Amount = null,
    string? Fee = null,
    Currency? Currency = null,
    string? Description = null) : IInvestmentTransactionInput;
