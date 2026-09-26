using JxFinance.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.GetInvestmentTransactions;

public sealed class GetInvestmentTransactionsRequest : PagedRequest
{
    public Guid? AccountId { get; init; }

    public Guid? SecurityId { get; init; }

    public InvestmentTransactionType? Type { get; init; }
}
