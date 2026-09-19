using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.CreateInvestmentTransaction;

public sealed record CreateInvestmentTransactionRequest(
    Guid AccountId,
    InvestmentTransactionType Type,
    DateOnly Date,
    Guid? SecurityId = null,
    string? Quantity = null,
    string? Price = null,
    string? Amount = null,
    string? Fee = null,
    Currency? Currency = null,
    string? Description = null);
