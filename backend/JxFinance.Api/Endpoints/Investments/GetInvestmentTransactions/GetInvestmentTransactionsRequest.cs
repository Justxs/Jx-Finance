using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.GetInvestmentTransactions;

public sealed class GetInvestmentTransactionsRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public Guid? AccountId { get; init; }

    public Guid? SecurityId { get; init; }

    public InvestmentTransactionType? Type { get; init; }
}
