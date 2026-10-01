using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetLedger;

public sealed class GetLedgerRequest : TransactionFilterRequest, IPagedRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public TransactionSortField? Sort { get; init; }

    public SortDirection? Direction { get; init; }
}
