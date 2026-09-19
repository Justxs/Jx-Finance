using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public interface IInvestmentTransactionInput
{
    Guid AccountId { get; }
    InvestmentTransactionType Type { get; }
    DateOnly Date { get; }
    Guid? SecurityId { get; }
    string? Quantity { get; }
    string? Price { get; }
    string? Amount { get; }
    string? Fee { get; }
    Currency? Currency { get; }
    string? Description { get; }
}
