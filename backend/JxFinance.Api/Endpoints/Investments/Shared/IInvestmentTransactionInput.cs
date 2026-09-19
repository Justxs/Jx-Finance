using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public interface IInvestmentTransactionInput
{
    Guid AccountId { get; }
    InvestmentTransactionType Type { get; }
    DateOnly Date { get; }
    Guid? SecurityId { get; }
    decimal? Quantity { get; }
    decimal? Price { get; }
    decimal? Amount { get; }
    decimal? Fee { get; }
    Currency? Currency { get; }
    string? Description { get; }
}
